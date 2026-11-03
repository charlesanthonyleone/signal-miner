"""SA-11: shared Wayback CDX circuit breaker (one per process). 2 host-down failures (refused/timeout) -> skip CDX for the rest of the run."""
import requests
DOWN=[0]
def is_open(): return DOWN[0]>=2
def note(e=None):
    if e is None: DOWN[0]=0
    elif isinstance(e,(requests.ConnectionError,requests.Timeout)): DOWN[0]+=1
