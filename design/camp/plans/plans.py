# Blockouts des plans du camp : un SVG par plan, cases de 16 px.
import json
T=16
LV=[(2,1),(3,2),(4,3),(5,4),(6,5)]  # emprise niveau 0..4, ancrée en bas au centre (la porte)
NOMS={1:'Récits',2:'Entraînement',3:'Armurerie',4:'Porte',5:'Cartes',6:'Atelier',7:'Tableau',8:'Estrade'}

def svg(plan):
    W,H=plan['taille']; o=[]
    o.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W*T} {H*T}" width="{W*T}" height="{H*T}" font-family="sans-serif">')
    o.append(f'<rect width="{W*T}" height="{H*T}" fill="#9cc77a"/>')
    for (x,y,w,h) in plan.get('eau',[]): o.append(f'<rect x="{x*T}" y="{y*T}" width="{w*T}" height="{h*T}" fill="#6fa8d6"/>')
    # chemins : listes de points en cases, largeur 2 cases
    for ch in plan['chemins']:
        pts=' '.join(f'{(x+.5)*T},{(y+.5)*T}' for x,y in ch)
        o.append(f'<polyline points="{pts}" fill="none" stroke="#d9c08f" stroke-width="{2*T}" stroke-linejoin="round" stroke-linecap="round"/>')
    for (cx,cy,r) in plan.get('places',[]): o.append(f'<circle cx="{cx*T}" cy="{cy*T}" r="{r*T}" fill="#d9c08f"/>')
    for (x,y) in plan['arbres']: o.append(f'<rect x="{x*T+1}" y="{y*T+1}" width="{T-2}" height="{T-2}" rx="5" fill="#3f7a3a"/>')
    if 'palissade' in plan:
        for seg in plan['palissade']:
            pts=' '.join(f'{x*T},{y*T}' for x,y in seg)
            o.append(f'<polyline points="{pts}" fill="none" stroke="#7a5230" stroke-width="5"/>')
    for i in range(W+1): o.append(f'<line x1="{i*T}" y1="0" x2="{i*T}" y2="{H*T}" stroke="#000" stroke-opacity=".07"/>')
    for j in range(H+1): o.append(f'<line x1="0" y1="{j*T}" x2="{W*T}" y2="{j*T}" stroke="#000" stroke-opacity=".07"/>')
    for n,(px,py) in plan['lieux'].items():   # (px,py) = case de la porte (bas centre)
        if n in plan.get('emprises',{}):       # un lieu qui a son emprise à lui (l'enclos du terrain, #77)
            x0,y0,x1,y1=plan['emprises'][n]
            o.append(f'<rect x="{x0*T}" y="{y0*T}" width="{(x1-x0)*T}" height="{(y1-y0)*T}" fill="#efe6cf" fill-opacity=".55" stroke="#6b4f2c" stroke-dasharray="4 3"/>')
            o.append(f'<rect x="{px*T}" y="{py*T}" width="{2*T}" height="{T}" fill="#7a5230"/>')
            cx=(x0+x1)/2*T; cy=y0*T+6
            o.append(f'<circle cx="{cx}" cy="{cy+10}" r="8" fill="#26215C"/><text x="{cx}" y="{cy+14}" font-size="11" fill="#fff" text-anchor="middle">{n}</text>')
            continue
        for lv,(w,h) in enumerate(LV[::-1]):
            niv=4-lv; x=px+1-w/2; y=py+1-h
            if niv==4: o.append(f'<rect x="{x*T}" y="{y*T}" width="{w*T}" height="{h*T}" fill="#efe6cf" fill-opacity=".55" stroke="#6b4f2c" stroke-dasharray="4 3"/>')
            elif niv==1: o.append(f'<rect x="{x*T}" y="{y*T}" width="{w*T}" height="{h*T}" fill="#c98f52" stroke="#6b4f2c"/>')
            elif niv==0: o.append(f'<rect x="{x*T}" y="{y*T}" width="{w*T}" height="{h*T}" fill="#7a5230"/>')
            else: o.append(f'<rect x="{x*T}" y="{y*T}" width="{w*T}" height="{h*T}" fill="none" stroke="#6b4f2c" stroke-opacity=".55"/>')
        cx=(px+1)*T; cy=(py+1-5)*T-1
        o.append(f'<circle cx="{cx}" cy="{cy+10}" r="8" fill="#26215C"/><text x="{cx}" y="{cy+14}" font-size="11" fill="#fff" text-anchor="middle">{n}</text>')
    fx,fy=plan['feu']
    o.append(f'<circle cx="{fx*T}" cy="{fy*T}" r="{1.2*T}" fill="#e8892a" stroke="#7a3b10" stroke-width="2"/><circle cx="{fx*T}" cy="{fy*T}" r="{.5*T}" fill="#f6d24a"/>')
    sx,sy=plan['apparition']; o.append(f'<circle cx="{sx*T}" cy="{sy*T}" r="5" fill="#185FA5" stroke="#fff" stroke-width="2"/>')
    ex,ey=plan['entree']; o.append(f'<text x="{ex*T}" y="{ey*T}" font-size="11" fill="#2b1a0a" text-anchor="middle">entrée</text>')
    cx,cy=plan['camera']; o.append(f'<rect x="{cx*T}" y="{cy*T}" width="{20*T}" height="{11*T}" fill="none" stroke="#185FA5" stroke-width="3" stroke-dasharray="10 6"/>')
    o.append('</svg>'); return '\n'.join(o)

def bord(W,H,trou=()):
    a=[]
    for i in range(W):
        for j in (0,H-1):
            if (i,j) not in trou: a.append((i,j))
    for j in range(1,H-1):
        for i in (0,W-1):
            if (i,j) not in trou: a.append((i,j))
    return a
def amas(x,y,w,h,saut=0): return [(i,j) for i in range(x,x+w) for j in range(y,y+h) if (i*3+j*5+saut)%4]

plans={}
# A. Le cercle : une palissade, trois rangées de lieux autour d'une place, des allées entre les rangées, la porte au sud.
W,H=38,26
lieuxA={1:(5,7),2:(16,7),3:(28,7),5:(5,14),7:(12,14),6:(29,14),8:(5,22),4:(24,22)}
plans['A']=dict(taille=(W,H),feu=(19,13),apparition=(19,16.6),entree=(18.6,25.6),camera=(1,2),
  lieux=lieuxA,places=[(19.5,13.5,4.2)],
  chemins=[[(18.5,25),(18.5,13)],[(4,9),(34,9)],[(19,9),(19,12)],[(5.5,9),(5.5,7)],[(16.5,9),(16.5,7)],[(28.5,9),(28.5,7)],
           [(3.5,16.5),(34,16.5)],[(5.5,16.5),(5.5,14)],[(12.5,16.5),(12.5,14)],[(29.5,16.5),(29.5,14)],
           [(10.5,16.5),(10.5,23.4),(5.5,23.4),(5.5,22)],[(20.8,16.5),(20.8,23.4),(24.5,23.4),(24.5,22)]],
  arbres=bord(W,H,{(18,25),(19,25)})+[(1,1),(2,1),(1,2),(36,1),(35,1),(36,2),(1,24),(1,23),(36,24),(36,23),(33,20),(34,21),(14,21),(15,22),(34,4)],
  palissade=[[(1.5,1.5),(36.5,1.5),(36.5,24.5),(20,24.5)],[(18,24.5),(1.5,24.5),(1.5,1.5)]])
# B. Le chemin : une longue allée d'ouest en est, les lieux de part et d'autre, le feu sur la place du milieu.
W,H=54,18
lieuxB={4:(3,6),6:(10,6),7:(21,6),3:(34,6),8:(47,6),2:(13,15),1:(32,15),5:(43,15)}
plans['B']=dict(taille=(W,H),feu=(26,11),apparition=(24,13),entree=(1.6,8.2),camera=(0,3),
  lieux=lieuxB,places=[(26.5,10.5,3.6)],
  chemins=[[(0,9),(10,9),(26,10),(40,9),(52,9)],[(3.5,9),(3.5,6)],[(10.5,9),(10.5,6)],[(21.5,9.5),(21.5,6)],[(34.5,9.5),(34.5,6)],[(47.5,9),(47.5,6)],
           [(9.5,9),(9.5,16.4),(13.5,16.4),(13.5,15)],[(28.5,10),(28.5,16.4),(32.5,16.4),(32.5,15)],[(39.5,9),(39.5,16.4),(43.5,16.4),(43.5,15)]],
  arbres=bord(W,H,{(0,9),(0,10)})+amas(26,1,5,4)+amas(39,1,5,4,1)+amas(2,12,7,4,2)+amas(19,14,3,3,1)+amas(48,12,5,4)+amas(25,15,3,2))
# C. Les clairières : le feu et le tableau au centre ; trois clairières reliées par des sentiers, des bois entre elles ; la porte à l'entrée.
W,H=42,28
lieuxC={1:(5,8),5:(13,8),2:(27,9),3:(35,7),7:(27,16),8:(25,24),6:(33,23),4:(8,24)}
# le terrain d'entraînement (2) est un enclos de 8 x 8 cases, ouvert au sud (mission #77, le 18 oct) : sa porte est l'entrée
enclosC=[[(27,9.3),(24.5,9.3),(24.5,3.3),(31.5,3.3),(31.5,9.3),(29,9.3)]]
plans['C']=dict(taille=(W,H),feu=(20,14),apparition=(18,17),entree=(14.6,27.6),camera=(1,0),
  lieux=lieuxC,emprises={2:(24,2,32,10)},palissade=enclosC,places=[(20.5,14.5,4.4),(9.5,6.5,4.6),(31.5,5.5,4.6),(29.5,21.5,4.4),(9.5,22.5,3.6)],
  chemins=[[(14.5,27),(14.5,19),(20,14.5)],[(20,14),(14.5,11),(5.5,11),(5.5,8)],[(13.5,11),(13.5,8)],
           [(20,14),(24,10.4),(35.5,10.4),(35.5,7)],[(27.5,10.4),(27.5,9)],
           [(20,14),(22,18.6),(38.5,18.6),(38.5,25.6),(33.5,25.6),(33.5,23)],[(22.4,18.6),(22.4,25.6),(25.5,25.6),(25.5,24)],[(27.5,18.6),(27.5,16)],[(14.5,25.6),(8.5,25.6),(8.5,24)]],
  arbres=bord(W,H,{(14,27),(15,27)})+amas(18,1,6,6)+amas(1,11,6,7,1)+amas(33,11,7,6,2)+amas(16,21,6,6,3)+amas(2,1,2,2))
for k,p in plans.items(): open(f'plan_{k}.svg','w',encoding='utf-8').write(svg(p))
json.dump({k:{'taille':p['taille'],'lieux':p['lieux']} for k,p in plans.items()},open('plans.json','w'),ensure_ascii=False,indent=1)
print('ok')
