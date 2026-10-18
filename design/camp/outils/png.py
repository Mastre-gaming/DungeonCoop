# Lecture et écriture PNG minimales (8 bits, sans entrelacement), sans dépendance.
import zlib, struct
def lire(chemin):
    d=open(chemin,'rb').read(); assert d[:8]==b'\x89PNG\r\n\x1a\n'
    i=8; idat=b''; pal=None; trns=None
    while i<len(d):
        n,t=struct.unpack('>I4s',d[i:i+8]); c=d[i+8:i+8+n]; i+=12+n
        if t==b'IHDR': w,h,bd,ct,_,_,il=struct.unpack('>IIBBBBB',c)
        elif t==b'PLTE': pal=[tuple(c[k:k+3]) for k in range(0,len(c),3)]
        elif t==b'tRNS': trns=c
        elif t==b'IDAT': idat+=c
    assert il==0
    raw=zlib.decompress(idat)
    if ct==3: assert bd in (8,4,2,1)
    else: assert bd==8, (bd,ct)
    canaux={0:1,2:3,3:1,4:2,6:4}[ct]; bpp=max(1,canaux*bd//8)
    ligne=(w*canaux*bd+7)//8; px=[]; prec=bytearray(ligne); k=0
    for y in range(h):
        f=raw[k]; s=bytearray(raw[k+1:k+1+ligne]); k+=1+ligne
        for x in range(ligne):
            a=s[x-bpp] if x>=bpp else 0; b=prec[x]; c=prec[x-bpp] if x>=bpp else 0
            if f==1: s[x]=(s[x]+a)&255
            elif f==2: s[x]=(s[x]+b)&255
            elif f==3: s[x]=(s[x]+(a+b)//2)&255
            elif f==4:
                p=a+b-c; pa,pb,pc=abs(p-a),abs(p-b),abs(p-c)
                s[x]=(s[x]+(a if pa<=pb and pa<=pc else b if pb<=pc else c))&255
        prec=s; r=[]
        if ct==6: r=[tuple(s[x*4:x*4+4]) for x in range(w)]
        elif ct==2: r=[tuple(s[x*3:x*3+3])+(255,) for x in range(w)]
        elif ct==4: r=[(s[x*2],)*3+(s[x*2+1],) for x in range(w)]
        elif ct==0: r=[(s[x],)*3+(255,) for x in range(w)]
        else:
            per=8//bd
            for x in range(w):
                v=(s[x//per]>>(8-bd*(x%per+1)))&((1<<bd)-1)
                al=trns[v] if trns and v<len(trns) else 255
                r.append(pal[v]+(al,))
        px.append(r)
    return w,h,px
def ecrire(chemin,w,h,px):
    raw=b''.join(b'\x00'+bytes(v for p in row for v in p) for row in px)
    def ch(t,c): return struct.pack('>I',len(c))+t+c+struct.pack('>I',zlib.crc32(t+c)&0xffffffff)
    open(chemin,'wb').write(b'\x89PNG\r\n\x1a\n'+ch(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+ch(b'IDAT',zlib.compress(raw,6))+ch(b'IEND',b''))
