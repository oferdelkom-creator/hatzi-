export function createPointsUI({t,api,mutate,getState,live}){
  const $=id=>document.getElementById(id),fmt=n=>(Number(n||0)/100).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  let key='',offset=0;
  const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
  function csv(rows,id){
    const heads=['Player','Telegram ID','Cards','Winning cards','Allocated','Card cost','Winnings','Refund','Net','Closing balance'];
    const safe=v=>'"'+String(v??'').replace(/^\s*[=+@\-]/,"'$&").replaceAll('"','""')+'"';
    const data=[heads,...rows.map(a=>[a.name,a.userId,a.cards,a.winningCards,a.allocated/100,a.spent/100,a.won/100,a.refund/100,(a.won+a.refund-a.spent)/100,a.balance/100])];
    const url=URL.createObjectURL(new Blob(['\uFEFF'+data.map(r=>r.map(safe).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    const a=el('a');a.href=url;a.download='bingo-points-'+id+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function table(rows){
    const wrap=el('div',undefined,'points-scroll'),tb=el('table'),head=el('tr');
    for(const [en,zh] of [['Player','玩家'],['Cards','卡片'],['Winning cards','获胜卡片'],['Allocated','分配'],['Card cost','卡片费用'],['Winnings','赢得积分'],['Refund','退回'],['Net +/−','净收益'],['Balance','余额']])head.append(el('th',t(en,zh)));
    const thead=el('thead');thead.append(head);tb.append(thead);const body=el('tbody');
    for(const a of rows){const row=el('tr');row.append(el('td',a.name),el('td',a.cards),el('td',a.winningCards));for(const n of [a.allocated,a.spent,a.won,a.refund,a.won+a.refund-a.spent,a.balance])row.append(el('td',fmt(n)));body.append(row);}tb.append(body);wrap.append(tb);return wrap;
  }
  function input(label,value='0.00'){
    const l=el('label',label),i=el('input');i.type='number';i.min='0';i.max='1000000';i.step='0.01';i.value=value;i.required=true;l.append(i);return {l,i};
  }
  function units(input){const s=input.value.trim();if(!/^\d+(\.\d{1,2})?$/.test(s))throw Error(t('Use up to 2 decimal places.','最多使用两位小数。'));const n=Math.round(Number(s)*100);if(!Number.isSafeInteger(n)||n<0||n>100000000)throw Error(t('Maximum: 1,000,000 points.','最多1,000,000积分。'));return n;}
  function render(){
    const {game,home,roomId}=getState(),p=game?.points,root=$('pointsPanel');$('reportsToggle').hidden=!live||!home;if(!home)$('reportsPanel').hidden=true;
    root.hidden=home||!p;if(root.hidden)return;
    const next=JSON.stringify([p,game.status,game.host,game.id]);if(next===key)return;key=next;root.replaceChildren();
    root.append(el('h2',t(p.settled?'Final points report':'Room play points',p.settled?'最终积分报告':'房间游戏积分')));
    root.append(el('p',t('Play points only: no purchase, cash value, redemption or transfers. Each new room starts with zero points.','仅限游戏积分：不可购买、兑现或转让，无现金价值。新房间积分从零开始。')));
    root.append(el('p',t('Card price: ','每张价格：')+fmt(p.price)+' · '+t('Pot: ','奖池：')+fmt(p.pot)));
    root.append(el('p',t('The pot is split per winning card on the same draw, with no host fee. Rounding to 0.01 point uses ascending player ID then card number. Closing without a winner refunds card costs.','同次抽球获胜的卡片平分奖池，房主不收手续费。0.01积分的余数按玩家编号及卡片编号升序分配。无胜者时关闭房间退还卡片费用。')));
    if(game.status==='lobby')root.append(el('p',t('Each player will spend: ','每位玩家将使用：')+fmt(p.price*game.cardCount)));
    if(p.reason==='refunded')root.append(el('p',t('Cancelled / no winner: card costs were refunded.','已取消或无胜者：卡片费用已退还。')));
    if(game.host&&game.status==='lobby'){
      const price=el('form',undefined,'points-form'),v=input(t('Points per card','每张卡片积分'),(p.price/100).toFixed(2)),save=el('button',t('Save price','保存价格'));price.append(v.l,save);
      price.onsubmit=async e=>{e.preventDefault();try{save.disabled=true;await mutate('price',{roomId,units:units(v.i)});}catch(err){status.textContent=err.message;}finally{save.disabled=false;}};
      const grant=el('form',undefined,'points-form'),who=el('select');who.setAttribute('aria-label',t('Player to credit','分配积分的玩家'));
      for(const a of p.rows.filter(a=>a.present)){const opt=el('option',a.name+' · '+a.userId);opt.value=a.userId;who.append(opt);}
      const amount=input(t('Add play points','添加游戏积分'),'100.00'),add=el('button',t('Add points','添加积分'));grant.append(who,amount.l,add);
      grant.onsubmit=async e=>{e.preventDefault();try{add.disabled=true;await mutate('grant',{roomId,target:who.value,units:units(amount.i)});}catch(err){status.textContent=err.message;}finally{add.disabled=false;}};
      const status=el('p');status.setAttribute('role','status');root.append(price,grant,status);
    }
    root.append(table(p.rows));
    if(game.host){
      if(p.settled){const dl=el('button',t('Download final report (CSV)','下载最终报告（CSV）'),'secondary');dl.onclick=()=>csv(p.rows,game.id);root.append(dl);}
      else root.append(el('p',t('Live preview. The final report is saved automatically when the room ends.','实时预览。房间结束后自动保存最终报告。')));
      const total=p.rows.reduce((s,a)=>s+a.won+a.refund-a.spent,0);root.append(el('p',t('Total player net: ','玩家净收益总计：')+fmt(total)));
    }
  }
  async function reports(){
    const root=$('reportsPanel');root.hidden=false;root.replaceChildren(el('p',t('Loading reports…','正在加载报告…')));
    try{const d=await api('reports',{offset});root.replaceChildren(el('h2',t('Your completed room reports','你已结束房间的报告')));
      if(!d.reports.length)root.append(el('p',t('No completed reports on this page.','本页暂无已结束的报告。')));
      for(const r of d.reports){const details=el('details'),f=r.report,rows=Object.entries(f.accounts).map(([userId,a])=>({userId,...a}));details.append(el('summary',r.room_id.slice(-6)+' · '+new Date(r.created_at).toLocaleString()+' · '+t('Pot ','奖池 ')+fmt(f.pot)));details.append(table(rows));const dl=el('button',t('Download CSV','下载CSV'),'secondary');dl.onclick=()=>csv(rows,r.room_id);details.append(dl);root.append(details);}
      const prev=el('button',t('Previous','上一页'),'secondary'),next=el('button',t('Next','下一页'),'secondary');prev.disabled=offset===0;next.disabled=d.reports.length<25;prev.onclick=()=>{offset=Math.max(0,offset-25);reports();};next.onclick=()=>{offset+=25;reports();};root.append(prev,next);
    }catch(e){root.replaceChildren(el('p',e.message));}
  }
  $('reportsToggle').textContent=t('My room reports','我的房间报告');$('reportsToggle').onclick=()=>{offset=0;reports();};return {render};
}
