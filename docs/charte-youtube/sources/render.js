const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();
for(const [f,w,h,o] of [['banniere',2560,1440,0],['profil',800,800,0],['filigrane',150,150,1]]){
 const p=await b.newPage({viewport:{width:w,height:h}});
 await p.goto('file://'+__dirname+'/'+f+'.html');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300);
 await p.screenshot({path:'out/'+f+'.png',omitBackground:!!o});}
await b.close();})();
