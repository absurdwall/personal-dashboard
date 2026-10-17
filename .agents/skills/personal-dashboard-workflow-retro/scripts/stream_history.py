"""Bounded stdlib traversal of one already-opened immutable JSON source.

No persistence/profile discovery. Original indices survive selection; each pass
hashes the complete same-FD bytes and rejects changes rather than exporting refs
for an inconsistent source. Optional text uses a bounded JSON-token buffer.
"""
import codecs
import hashlib
import json
import os
import re

CHUNK = 64 * 1024
WORKING = 8 * 1024 * 1024
ARRAY_FIELDS = {"messages", "workHistory", "taskOperations", "memoryProposals", "habitRefreshReceipts", "usageBindings"}

class LargeString:
    pass

class IndexedList(list):
    def __init__(self):
        super().__init__()
        self.indices = []
    def add(self, index, value):
        self.indices.append(index)
        self.append(value)

def indexed(values):
    return zip(values.indices, values) if isinstance(values, IndexedList) else enumerate(values or [])

def pointer(path):
    return "/" + "/".join(str(part).replace("~", "~0").replace("/", "~1") for part in path)

class Scanner:
    def __init__(self, stream, visitor):
        self.stream, self.visitor = stream, visitor
        self.buffer, self.pos = b"", 0
        self.sha = hashlib.sha256()
        self.bytes = 0
        self.key_bytes = 0
    def fill(self):
        if self.pos == len(self.buffer):
            self.buffer = self.stream.read(CHUNK)
            self.pos = 0
            self.sha.update(self.buffer)
            self.bytes += len(self.buffer)
        return bool(self.buffer)
    def peek(self):
        return self.buffer[self.pos] if self.fill() else None
    def take(self):
        value = self.peek()
        if value is None: raise ValueError("incomplete JSON source")
        self.pos += 1
        return value
    def space(self):
        while self.peek() in (32, 9, 10, 13): self.pos += 1
    def string(self, key=False):
        if self.take() != 34: raise ValueError("invalid JSON string")
        token = bytearray(b'"')
        decoder = codecs.getincrementaldecoder("utf-8")("strict")
        oversized = False
        def retain(segment):
            nonlocal oversized
            if not oversized:
                if len(token) + len(segment) > CHUNK: oversized = True; token.clear()
                else: token.extend(segment)
        while self.fill():
            quote, slash = self.buffer.find(b'"', self.pos), self.buffer.find(b'\\', self.pos)
            ends = [end for end in (quote, slash) if end >= 0]
            end = min(ends) if ends else len(self.buffer)
            segment = self.buffer[self.pos:end]
            if re.search(rb"[\x00-\x1f]", segment): raise ValueError("control byte in JSON string")
            decoder.decode(segment)
            retain(segment); self.pos = end
            if not ends: continue
            marker = self.take()
            if marker == 34:
                decoder.decode(b"", final=True)
                retain(b'"')
                if oversized:
                    if key: raise ValueError("JSON object key exceeds 64 KiB working bound")
                    return LargeString()
                return json.loads(token)
            decoder.decode(b"", final=True)
            decoder = codecs.getincrementaldecoder("utf-8")("strict")
            escape = self.take()
            if escape not in b'"\\/bfnrtu': raise ValueError("invalid JSON escape")
            retain(bytes((92, escape)))
            if escape == 117:
                digits = bytes(self.take() for _ in range(4))
                if not re.fullmatch(rb"[0-9a-fA-F]{4}", digits): raise ValueError("invalid Unicode escape")
                retain(digits)
        raise ValueError("unterminated JSON string")
    def value(self, path=()):
        if len(path) > 64: raise ValueError("source nesting exceeds 64 levels")
        self.space(); lead = self.peek()
        if lead in (123, 91):
            object_ = lead == 123
            self.take(); self.visitor("object" if object_ else "array", path, None)
            self.space(); close = 125 if object_ else 93
            if self.peek() == close:
                self.take(); self.visitor("end", path, None); return
            keys, key_bytes, index = set(), 0, 0
            while True:
                if object_:
                    self.space(); key = self.string(True)
                    cost = len(key.encode("utf-8")) + 64
                    key_bytes += cost; self.key_bytes += cost
                    if key in keys: raise ValueError("duplicate source object key")
                    if self.key_bytes > WORKING: raise ValueError("object keys exceed working bound")
                    keys.add(key); self.space()
                    if self.take() != 58: raise ValueError("missing JSON colon")
                else: key = index; index += 1
                self.value(path + (key,)); self.space(); delimiter = self.take()
                if delimiter == close: break
                if delimiter != 44: raise ValueError("invalid JSON container delimiter")
            self.key_bytes -= key_bytes
            self.visitor("end", path, None); return
        if lead == 34: value = self.string()
        else:
            token = bytearray()
            while self.peek() is not None and self.peek() not in b" \t\n\r,]}":
                token.append(self.take())
                if len(token) > 128: raise ValueError("scalar token exceeds working bound")
            if not token: raise ValueError("invalid JSON value")
            value = json.loads(token)
            if isinstance(value, float) and not (-float("inf") < value < float("inf")): raise ValueError("nonfinite source number")
        self.visitor("scalar", path, value)
    def run(self):
        self.value(); self.space()
        if self.peek() is not None: raise ValueError("trailing JSON source content")
        return self.sha.hexdigest(), self.bytes

def validate(kind, path, value):
    if kind=="scalar" and isinstance(value,LargeString) and path and path[-1] in ("id","executionId","role","messageDate","vaultKey"):
        raise ValueError("source identity token exceeds 64 KiB working bound")
    if not path and kind != "object" and kind != "end": raise ValueError("source root must be an object")
    if path == ("sessions",) and kind not in ("array", "end"): raise ValueError("sessions must be an array")
    if len(path) == 2 and path[0] == "sessions" and kind not in ("object", "end"): raise ValueError("damaged session structure")
    if len(path) == 3 and path[0] == "sessions" and path[2] in ARRAY_FIELDS and kind not in ("array", "end"): raise ValueError("damaged session evidence array")
    if len(path) == 4 and path[0] == "sessions" and path[2] in ARRAY_FIELDS and kind not in ("object", "end"): raise ValueError("damaged evidence record structure")
    if len(path) == 5 and path[0] == "sessions" and path[2] == "workHistory" and path[4] in ("items", "refreshes") and kind not in ("array", "end"): raise ValueError("damaged work history array")
    if len(path) == 6 and path[0] == "sessions" and path[2] == "workHistory" and path[4] in ("items", "refreshes") and kind not in ("object", "end"): raise ValueError("damaged work item/refresh structure")
    if len(path) == 7 and path[0] == "sessions" and path[2] == "workHistory" and path[4] == "items" and path[6] == "changes" and kind not in ("array", "end"): raise ValueError("damaged change evidence array")
    if len(path) == 8 and path[0] == "sessions" and path[2] == "workHistory" and path[4] == "items" and path[6] == "changes" and kind not in ("object", "end"): raise ValueError("damaged change evidence structure")

def request_matches(message, selectors):
    eid = message.get("executionId")
    date = message.get("messageDate")
    return (message.get("role") == "user" and isinstance(eid, str) and bool(eid)
        and (not selectors.execution or eid == selectors.execution)
        and (not selectors.date_from or isinstance(date, str) and date >= selectors.date_from)
        and (not selectors.date_to or isinstance(date, str) and date <= selectors.date_to))

class Record:
    """One allowlisted record; oversized unrelated records never enter selection."""
    def __init__(self, root, fields):
        self.root, self.fields, self.nodes = root, fields, {}
        self.value, self.size, self.overflow, self.omissions = {}, 0, False, []
        self.execution, self.role, self.observed = None, None, set()
    def visit(self, kind, path, value):
        if kind == "scalar" and len(path) == len(self.root)+1:
            if path[-1] == "executionId": self.execution = value
            if path[-1] == "role": self.role = value
        if kind == "scalar" and path[-2:-1] == ("observedInExecutions",) and isinstance(value, str):
            if len(self.observed) < 8192: self.observed.add(value)
            else: self.overflow = True
        if kind == "end" or self.overflow: return
        if path == self.root:
            self.nodes[path] = self.value; self.size += 512; return
        parent = self.nodes.get(path[:-1])
        key = path[-1]
        if parent is None or isinstance(key, str) and key not in self.fields: return
        if key == "content" and "workHistory" in path: return
        if isinstance(value, LargeString):
            value = None
            self.omissions.append({"pointer": pointer(path), "reason":"string token omitted above 64 KiB working bound"})
        if kind == "object": child = {}; self.size += 512
        elif kind == "array": child = []; self.size += 64
        else: child = value; self.size += len(value.encode("utf-8")) + 64 if isinstance(value,str) else 64
        if self.size > WORKING: self.overflow = True; self.nodes.clear(); self.value = {}; return
        if isinstance(parent, list): parent.append(child)
        else: parent[key] = child
        if kind in ("object","array"): self.nodes[path] = child


def read_selected(stream, selectors, fields):
    initial = os.fstat(stream.fileno())
    identity = lambda state: (state.st_dev,state.st_ino,state.st_size,state.st_mtime_ns,state.st_ctime_ns)
    expected = None
    def traverse(visitor):
        nonlocal expected
        stream.seek(0)
        def checked(kind,path,value): validate(kind,path,value); visitor(kind,path,value)
        digest, size = Scanner(stream,checked).run()
        if identity(os.fstat(stream.fileno())) != identity(initial): raise ValueError("source changed during evidence traversal")
        if expected is not None and (digest,size) != expected: raise ValueError("source bytes changed between selection passes")
        expected = digest,size
    sessions, metadata, message = {}, {}, {}
    candidate, schema, sessions_seen, selection_overflow = False, None, False, False
    metadata_bytes = 0
    def first(kind,path,value):
        nonlocal metadata,message,candidate,schema,sessions_seen,metadata_bytes,selection_overflow
        if kind == "scalar" and path == ("schemaVersion",): schema = value
        if kind == "array" and path == ("sessions",): sessions_seen = True
        if len(path)==2 and path[0]=="sessions":
            if kind=="object": metadata={};candidate=False
            elif kind=="end" and candidate and (not selectors.session or metadata.get("id")==selectors.session) and (not selectors.vault or metadata.get("vaultKey")==selectors.vault):
                metadata_bytes += sum(len(str(v).encode("utf-8"))+64 for v in metadata.values())+512
                if metadata_bytes > WORKING: selection_overflow=True
                elif not selection_overflow: sessions[path[1]]=metadata
        if len(path)==3 and path[0]=="sessions" and kind=="scalar" and path[2] in ("id","vaultKey","runId","runState","progress"):
            metadata[path[2]]=None if isinstance(value,LargeString) else value
            if isinstance(value,LargeString): metadata.setdefault("_streamOmissions",[]).append({"pointer":pointer(path),"reason":"metadata string token omitted above 64 KiB working bound"})
        if len(path)==4 and path[0]=="sessions" and path[2]=="messages":
            if kind=="object": message={}
            elif kind=="end": candidate = candidate or request_matches(message,selectors)
        if len(path)==5 and path[:1]==("sessions",) and path[2]=="messages" and kind=="scalar" and path[4] in ("role","executionId","messageDate"):
            message[path[4]]=value
    traverse(first)
    if type(schema) is not int or schema != 1 or not sessions_seen: raise ValueError("unsupported history schema; schemaVersion 1 and sessions array required")
    metadata_overflow=selection_overflow
    requests={index:{} for index in sessions};selected_ids={index:set() for index in sessions};selection_bytes=metadata_bytes;matched_count=0
    def second(kind,path,value):
        nonlocal message,selection_bytes,selection_overflow,matched_count
        if len(path)<2 or path[0]!="sessions" or path[1] not in sessions: return
        if len(path)==4 and path[2]=="messages":
            if kind=="object": message={}
            elif kind=="end" and request_matches(message,selectors):
                matched_count += 1
                selection_bytes += len(message["executionId"].encode("utf-8"))+128
                if selection_bytes>WORKING: selection_overflow=True
                elif not selection_overflow:
                    requests[path[1]][path[3]]=message["executionId"];selected_ids[path[1]].add(message["executionId"])
        if len(path)==5 and path[2]=="messages" and kind=="scalar" and path[4] in ("role","executionId","messageDate"): message[path[4]]=value
    traverse(second)
    source={"schemaVersion":1,"sessions":IndexedList(),"runtimeThreadsByExecution":{}}
    by_index={};all_ids=set().union(*selected_ids.values()) if selected_ids else set()
    metadata_omissions=[omission for session in sessions.values() for omission in session.pop("_streamOmissions",[])]
    for index,session in sessions.items():
        copy=dict(session);copy.update({field:IndexedList() for field in ARRAY_FIELDS});source["sessions"].add(index,copy);by_index[index]=copy
    record=None;omissions=metadata_omissions;retained_bytes=selection_bytes
    def third(kind,path,value):
        nonlocal record,selection_overflow,retained_bytes
        if len(path)==2 and path[0]=="runtimeThreadsByExecution" and path[1] in all_ids and kind=="scalar":
            source["runtimeThreadsByExecution"][path[1]]=None if isinstance(value,LargeString) else value
        if len(path)<4 or path[0]!="sessions" or path[1] not in sessions or path[2] not in ARRAY_FIELDS: return
        if len(path)==4 and kind=="object": record=Record(path,fields)
        if record is None: return
        record.visit(kind,path,value)
        if len(path)==4 and kind=="end":
            selected=(record.execution in selected_ids[path[1]] or bool(record.observed & selected_ids[path[1]]))
            if path[2]=="messages": selected = path[3] in requests[path[1]] or record.role=="assistant" and record.execution in selected_ids[path[1]]
            if selected:
                retained_bytes += record.size
                if record.overflow or retained_bytes>WORKING: selection_overflow=True
                elif not selection_overflow:
                    by_index[path[1]][path[2]].add(path[3],record.value);omissions.extend(record.omissions)
            record=None
    traverse(third)
    return source, expected, omissions, selection_overflow, None if metadata_overflow else matched_count
