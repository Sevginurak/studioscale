import json,sys
from PIL import Image, ImageDraw
d=sys.argv[1]; man=json.load(open(d+'/manifest.json')); out=sys.argv[2]; names=sys.argv[3:] 
items=[m for m in man if not names or m['slug'] in names]
W=1800; cols=int(__import__("os").environ.get("COLS","4"))
cw=W//cols; rows=[]; 
ims=[]
for m in items:
    im=Image.open(f"{d}/{m['slug']}.png").convert('RGB'); s=(cw-20)/im.width; im=im.resize((cw-20,int(im.height*s))); ims.append((m,im))
H=0; y=0; pos=[]; 
for i in range(0,len(ims),cols):
    row=ims[i:i+cols]; h=max(im.height for _,im in row)+30
    for j,(m,im) in enumerate(row): pos.append((j*cw+10,y+24,im,m))
    y+=h
sheet=Image.new('RGB',(W,y),(40,40,40)); dr=ImageDraw.Draw(sheet)
for x,yy,im,m in pos: sheet.paste(im,(x,yy)); dr.text((x,yy-16),m['slug'],fill=(255,255,255))
sheet.save(out)
