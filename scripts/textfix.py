"""Repair mojibake from gopher/gateway pages decoded as latin-1 (Big5/GBK/SJIS/cp1251/UTF-8 bytes)."""
import re
try: from charset_normalizer import from_bytes
except Exception: from_bytes=None
HI=re.compile(r"[\x80-\xff]")
def fix(s):
    s=str(s or "")
    if not HI.search(s): return s
    try: b=s.encode("latin1")
    except UnicodeEncodeError: return s
    try: return b.decode("utf-8")
    except UnicodeDecodeError: pass
    for enc in ("big5","gbk","shift_jis","euc_kr","koi8_r"):
        try: t=b.decode(enc)
        except UnicodeDecodeError: continue
        if not re.search(r"[\x00-\x08\x80-\x9f]",t): return t
    # unrecoverable: strip control-ish latin-1 noise runs
    return re.sub(r"[\x80-\xff]{3,}","…",s)
