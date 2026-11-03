"""SB-2: curate harvested piles in finds/: strip HTML, drop exact/near duplicate titles, and cut off-theme rows
(INVENTO themes must hit a weird-tech regex; forum piles drop signup/api/ad junk). Runs at the end of collect.py."""
import json, re, html, os
TH={
 "dead":r"spirit|ouija|planchette|talking board|séance|seance|medium|afterlife|ghost|paranormal|premature burial|coffin|grave|corpse|deceased|dead|necro|evp|soul|ectoplasm|apparition",
 "immortal":r"immortal|longevity|life[- ]?extension|rejuvenat|revival|reviv|resuscitat|cryo|suspended animation|preserv\w* (of )?(body|bodies|human|cells?|organism)|aging|ageing|youth|elixir|vitrif|freez\w* (human|body)|regenerat|telomer",
 "mindctl":r"mind|thought|brain|neur|hypno|subliminal|psych|telepath|consciousness|behavio|influenc\w* (the )?(person|people|human)|sleep|dream|trance|emotion|memory|cognit|eeg|mental",
 "weather":r"weather|rain|cloud|fog|hail|storm|hurricane|typhoon|tornado|lightning|precipitation|seeding|ionosph|climate|drought|snow|atmospher",
 "aliens":r"extraterrestr|alien|ufo|flying saucer|saucer|anti-?gravit|gravit|interstellar|seti|spacecraft|disc[- ]shaped|space ?ship|levitat|propulsion|warp",
 "survival":r"surviv|shelter|bunker|fallout|radiation|radioactive|gas mask|doomsday|emergency|disaster|nuclear|bomb|apocalyp|decontaminat|ration|water purif|bug[- ]?out|escape|evacuat|lifeboat|ark",
 "deterrent":r"nuclear|deterr|emp|electromagnetic pulse|missile|warhead|shelter|explosi|blast|radiat|bunker|interceptor|ballistic|atomic",
 "formulas":r"formula|recipe|elixir|tonic|liqueur|liquor|potion|salve|ointment|remedy|medicin|composition for|process for (the )?(making|production|preparing)|beverage|dye|ink|perfume|incense|balm|cure|tincture|cordial|bitters|embalm|secret",
 "secret":r"secret|cipher|crypt|covert|spy|espionage|surveil|listening|eavesdrop|camouflage|conceal|hidden|invisible ink|steganograph|code|clandestin|stealth|intellig|scrambl|bug",
 "wartech":r"weapon|war|military|bomb|explosi|flame ?thrower|torpedo|missile|gun|artillery|tank|armou?r|submarine|grenade|mine\b|ray|death|sonic|infrasound|incapacit|warfare|bullet|projectile|rocket",
}
TAG=re.compile(r"<[^>]+>")
def clean(t): return re.sub(r"\s+"," ",html.unescape(TAG.sub("",t or ""))).replace("…","…").strip(" .…")
def norm(t): return re.sub(r"[^a-z0-9]+"," ",t.lower()).strip()[:60]
FORUMJUNK=re.compile(r"adfree|signup|/api/|insert\?|login|register|\.cgi\?.*(signup|ad)|privacy|terms|banner|/ads?/|Home$",re.I)
BOILER=re.compile(r"^(links?|related links|cool links|my links|about me|about|home ?page|home|welcome|index|untitled|untitled document|page title|new page \d*|picture page|pictures?|photos?|my page|contact|contact me|email me|guestbook|sign my guestbook|search links|introduction|main|menu|navigation|frames?|blank|test|default|no title|document|unsaved:.*|ppt slide|frontpage run-time component page|redirect\w*|moved|404.*|error.*|object moved|search)$",re.I)
def run(root="finds"):
    rep={}
    for f in sorted(os.listdir(root)):
        if not f.endswith(".json"): continue
        p=os.path.join(root,f)
        try: L=json.load(open(p))
        except Exception: continue
        if not isinstance(L,list) or not L or not isinstance(L[0],dict): continue
        k=f[8:-5] if f.startswith("invento_") else None
        rx=re.compile(r"\b("+TH[k]+")",re.I) if k in TH else None
        out=[];seen=set()
        for x in L:
            if "title" in x and isinstance(x["title"],str): x["title"]=clean(x["title"])
            t=x.get("title","");n=norm(t)
            if f.startswith("invento_") and n and n in seen: continue
            if rx and not rx.search(t+" "+x.get("preview","")+" "+x.get("query","").split("q=")[0]): continue
            if (f.startswith("wb_") or f=="hidden.json") and (BOILER.match(t) or (len(t.split())<=4 and n in seen)): continue
            if f=="forums.json" and FORUMJUNK.search(t+" "+x.get("url","")): continue
            seen.add(n);out.append(x)
        if len(out)!=len(L):
            rep[f]=(len(L),len(out)); json.dump(out,open(p,"w"),indent=0 if len(out)>200 else 1)
    print("curate",rep); return rep
if __name__=="__main__": os.chdir(os.path.join(os.path.dirname(__file__),"..")); run()
