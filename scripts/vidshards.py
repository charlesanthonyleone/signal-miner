"""Dead-host Wayback CDX shards for DEEP VIDEO (grayspace personal hosts, not archive.org items).
Each shard is a URL prefix small enough to answer inside a timeout; on timeout a shard is split
into 36 letter sub-shards (chunked retry), so the scheduled job builds a steady pile."""
import random
GEO=["Hollywood","Area51","SoHo","Tokyo","SunsetStrip","Athens","Heartland","TimesSquare","Colosseum","Vienna","CapeCanaveral","Paris","Pentagon","Baja","Bourbonstreet","RainForest","Yosemite","MotorCity","EnchantedForest","Nashville","SiliconValley","CollegePark","Broadway","Hotsprings","Pipeline","Petsburgh","Eureka","Wellesley"]
AF=["film","indie","music","rock","journal","80s","anime","biz","punk","scifi","tv","art","ar","ca","ny","tx","fl","oh","nc","pa","mi","ga","il","co","wa","ma","mn","or","ok","in"]
FC=["lavendar","meltingpot","tattooine","rivendell","victorian","roswell","skyscraper","marina","wave","olympia","underworld","oasis","bally","boozers","dreamscape","millenium","greenwich","campus","westwood"]
A36="abcdefghijklmnopqrstuvwxyz0123456789"
def shards():
    S=[f"www.geocities.com/{g}/" for g in GEO]+[f"www.oocities.org/{g.lower()}/" for g in GEO]
    S+=[f"www.angelfire.com/{a}/{c}" for a in AF for c in A36[:26]]
    S+=[f"members.tripod.com/{c}" for c in A36]+[f"members.tripod.com/~{c}" for c in A36]
    S+=[f"www.fortunecity.com/{f}/" for f in FC]+[f"members.xoom.com/{c}" for c in A36]
    S+=[f"www.50megs.com/{c}" for c in A36]+[f"www.geocities.ws/{c}" for c in A36]
    S+=[f"members.aol.com/{c}" for c in A36]+[f"hometown.aol.com/{c}" for c in A36]
    random.shuffle(S); return S
def split(s): return [s+c for c in A36]
VIDRE="original:.*\\.(mpg|mpeg|avi|mov|qt|wmv|asf|rm|flv|mp4|m4v|swf)$"
