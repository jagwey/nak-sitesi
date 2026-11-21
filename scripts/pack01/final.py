import render,art,json,os,shutil,sys
P=r"C:\Users\Osman\OneDrive\Belgeler\ChatGPT\Nakış desen üretimi\Paket_01_Geleneksel"
os.makedirs(P+r"\VP3",exist_ok=True);os.makedirs(P+r"\Gorseller",exist_ok=True)
hoops={"Pfaff 120x120 (creative 120 Square)":(120,120),"Pfaff 180x130":(180,130),"Pfaff 240x150":(240,150),"Pfaff 260x200":(260,200)}
rep={}
for k,D in art.DESIGNS.items():
    for t in "SL":
        n=f"{k}_{t}"
        render.render_all(f"out/{n}.vp3",f"out/{n}_normal.png",f"out/{n}_kumas.png",2000)
        rep[n]=render.qa(f"out/{n}.vp3",hoops)
        shutil.copy(f"out/{n}.vp3",P+rf"\VP3\{n}.vp3")
        for s in ("normal","kumas"): shutil.copy(f"out/{n}_{s}.png",P+rf"\Gorseller\{n}_{s}.png")
json.dump(rep,open(P+r"\qa_rapor.json","w",encoding="utf-8"),ensure_ascii=False,indent=1)
for n,r in rep.items(): print(n,r['width_mm'],r['height_mm'],r['stitches'],r['colors'],'j',r['jumps'],r['long_jumps_gt12mm'],'len',r['min_len'],r['max_len'],'<0.3:',r['n_lt03'],'>7:',r['n_gt7'],r['hoops'])
