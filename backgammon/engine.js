// Pure rules, shared with the local demo. Live randomness is injected only by the server.
export function initial(roll){
  const board=Array(24).fill(0);board[23]=2;board[12]=5;board[7]=3;board[5]=5;board[0]=-2;board[11]=-5;board[16]=-3;board[18]=-5;
  let a=roll(),b=roll();while(a===b){a=roll();b=roll();}
  return {board,bar:[0,0],off:[0,0],turn:a>b?0:1,dice:[a,b],remaining:[a,b],phase:'move',winner:null,turnNumber:1,opening:[a,b],lastMove:null};
}
const sign=p=>p===0?1:-1;
export function steps(s,die){
  const p=s.turn,sg=sign(p),froms=s.bar[p]?[-1]:s.board.map((n,i)=>n*sg>0?i:-2).filter(i=>i!==-2),out=[];
  const home=s.bar[p]===0&&s.board.every((n,i)=>n*sg<=0||(p===0?i<=5:i>=18));
  for(const from of froms){
    const to=from===-1?(p===0?24-die:die-1):from+(p===0?-die:die);
    if(to>=0&&to<24){if(s.board[to]*sg>=-1)out.push({from,to,die});}
    else if(from!==-1&&home){
      const distance=p===0?from+1:24-from;
      const further=s.board.some((n,i)=>n*sg>0&&(p===0?i>from:i<from));
      if(die===distance||(die>distance&&!further))out.push({from,to:24,die});
    }
  }return out;
}
function applyStep(s,m){
  const n=structuredClone(s),p=s.turn,sg=sign(p);
  if(m.from===-1)n.bar[p]--;else n.board[m.from]-=sg;
  if(m.to===24)n.off[p]++;else {if(n.board[m.to]===-sg){n.board[m.to]=0;n.bar[1-p]++;}n.board[m.to]+=sg;}
  n.remaining.splice(n.remaining.indexOf(m.die),1);n.lastMove=m;return n;
}
function sequences(s){
  if(s.off[s.turn]===15||!s.remaining.length)return [[]];
  const result=[];
  for(const die of new Set(s.remaining))for(const move of steps(s,die))for(const tail of sequences(applyStep(s,move)))result.push([move,...tail]);
  return result.length?result:[[]];
}
export function legal(s){
  if(s.phase!=='move'||s.winner!==null)return [];
  let all=sequences(s),max=Math.max(...all.map(x=>x.length));
  all=all.filter(x=>x.length===max);
  if(max===1){const high=Math.max(...all.map(x=>x[0].die));all=all.filter(x=>x[0].die===high);}
  const seen=new Set();return all.filter(x=>x.length).map(x=>x[0]).filter(m=>{const key=m.from+':'+m.die;if(seen.has(key))return false;seen.add(key);return true;});
}
function finishTurn(s){s.turn=1-s.turn;s.phase='roll';s.remaining=[];s.turnNumber++;return s;}
export function act(state,player,action,roll){
  if(state.winner!==null)throw Error('Game already finished');
  if(![0,1].includes(player))throw Error('Not a player');
  let s=structuredClone(state);
  if(action.type==='resign'){s.winner=1-player;s.phase='finished';s.reason='resignation';return s;}
  if(player!==s.turn)throw Error('Wait for your turn');
  if(action.type==='roll'){
    if(s.phase!=='roll')throw Error('Dice already rolled');
    const a=roll(),b=roll();s.dice=[a,b];s.remaining=a===b?[a,a,a,a]:[a,b];s.phase='move';
    if(!legal(s).length){s.lastMove={pass:true};finishTurn(s);}return s;
  }
  if(action.type!=='move'||s.phase!=='move')throw Error('Invalid action');
  const move=legal(s).find(m=>m.from===action.from&&m.die===action.die);
  if(!move)throw Error('Illegal move. Use as many dice as possible.');
  s=applyStep(s,move);
  if(s.off[player]===15){s.winner=player;s.phase='finished';const other=1-player,backgammon=s.bar[other]>0||s.board.some((n,i)=>n*sign(other)>0&&(player===0?i<=5:i>=18));s.result=s.off[other]>0?'single':backgammon?'backgammon':'gammon';s.reason='bearoff';return s;}
  if(!s.remaining.length||!legal(s).length)finishTurn(s);return s;
}
export function pipCount(s,p){return s.bar[p]*25+s.board.reduce((sum,n,i)=>sum+Math.max(0,n*sign(p))*(p===0?i+1:24-i),0);}
