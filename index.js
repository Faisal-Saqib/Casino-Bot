import fs from "fs/promises";
import "dotenv/config";
import { App } from "@slack/bolt";

const DataBase = "./data/user.json";
async function FetchData() {
    let RawData=await fs.readFile(DataBase,"utf-8");
    return JSON.parse(RawData);
}

let users=await FetchData();

async function   UpdateDataBase() {
    let RawData=JSON.stringify(users);
    await fs.writeFile(DataBase,RawData,"utf-8");  
}

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
});
app.command("/casino-ping", async ({ command, ack, respond }) => {
  await ack();
    const start = Date.now();
  const latency = Date.now() - start;
  const userID=command.user_id;
  

  if(!users[userID])
  {
    users[userID]={username:command.user_name,userid:userID,balance:1000,daily:Date.now(),work:Date.now()};
  }
  await respond({ text: `Pong!\nLatency: ${latency}ms` });
  UpdateDataBase();

});
app.command("/casino-work", async ({ command, ack, respond }) => {
  await ack();
  const userID=command.user_id;
  if(!users[userID])
  {
    users[userID]={username:command.user_name,userid:userID,balance:1000,daily:Date.now(),work:Date.now()};
  }
  let now=Date.now();
  let dif=users[userID].work-now;
  if (dif<=0)
  {
    const amt=Math.floor(Math.random()*(500-100+1))+100;
    users[userID].balance+=amt;

    // meaning we ahead of the next daily of reward limit
    await respond({text :`Received  ${amt} coins from working , new balance = ${users[userID].balance}`});
    users[userID].work=now+1*60*60*1000; // changing the next daily to 24 hours ahead
  }
  else
  {
    let rem=dif;
    let hours=Math.floor((rem/(60*60*1000)));
    rem%=(60*60*1000);
    let mins=Math.floor(rem/(60*1000));
    rem%=(60*1000);
    let sec=Math.floor(rem/1000);
    await respond({text : `Wait ${mins}m ${sec}s before working again`});
  }
  UpdateDataBase();

});
app.command("/casino-daily", async ({ command, ack, respond }) => {
  await ack();
  const userID=command.user_id;
  if(!users[userID])
  {
    users[userID]={username:command.user_name,userid:userID,balance:1000,daily:Date.now(),work:Date.now()};
  }
  let now=Date.now();
  let dif=users[userID].daily-now;
  if (dif<=0)
  {
    users[userID].balance+=1000;
    // meaning we ahead of the next daily of reward limit
    await respond({text :`Received daily 1000 coins, new balance = ${users[userID].balance}`});
    users[userID].daily=now+24*60*60*1000; // changing the next daily to 24 hours ahead
  }
  else
  {
    let rem=dif;
    let hours=Math.floor((rem/(60*60*1000)));
    rem%=(60*60*1000);
    let mins=Math.floor(rem/(60*1000));
    rem%=(60*1000);
    let sec=Math.floor(rem/1000);
    await respond({text : `Wait ${hours}h ${mins}m ${sec}s before using daily again`});
  }
  UpdateDataBase();

});
app.command("/casino-balance", async ({ command, ack, respond }) => {
  await ack();
  const userID=command.user_id;
  if(!users[userID])
  {
    users[userID]={username:command.user_name,userid:userID,balance:1000,daily:Date.now(),work:Date.now()};
  }
    await respond({text :`Current Balance = ${users[userID].balance}`});
  UpdateDataBase();

});

app.command("/casino-coin-flip", async ({ command, ack, respond }) => {
  await ack();
  const userID=command.user_id;
  if(!users[userID])
  {
    users[userID]={username:command.user_name,userid:userID,balance:1000,daily:Date.now(),work:Date.now()};
  }
  const msg=command.text;
  const words=msg.split(" ");
  if(words.length != 2)
  {
    await respond({text:"Command should have only two parameter seperated by a single space"});
    return;
  }
  const prediction = words[0];
  if(prediction!="heads" && prediction!="tails")
  {
    await respond({text:"First parameter should be heads or tails strictly!"});
    return;    
  }
  let amount = 0;
  try {
    amount=Number(words[1]);
  } catch {
    await respond({text:"Amount should strictly be a Integer!"});
    return;        
  }
  if(isNaN(amount))
  {
    await respond({text:"Amount should strictly be a Integer!"});
    return;            
  }
  if(amount > users[userID].balance)
  {
    await respond({text:"Amount should be atmost your balance!"});
    return;                
  }
  let outcome = "heads";
  if (Math.random() >= 0.5)
  {
    outcome="tails";
  }
  if (outcome === prediction)
  {
    users[userID].balance+=amount;
    await respond({text :`You Won , New Balance = ${users[userID].balance} `});
  }
  else
  {
    users[userID].balance-=amount;
    await respond({text :`You Lost , New Balance = ${users[userID].balance} `});    
  }

  UpdateDataBase();

});
app.command("/casino-leaderboard", async ({ command, ack, respond }) => {
  await ack();
  const userID=command.user_id;
  if(!users[userID])
  {
    users[userID]={username:command.user_name,userid:userID,balance:1000,daily:Date.now(),work:Date.now()};
  }
  let ar = [];
  for(let x in users)
  {
    ar.push([users[x].balance,users[x].username,users[x].userid]);
  }
  ar.sort((a,b) => b[0]-a[0]);
  let og="";
  
  let myrank=0;

  og+=`Rank    Username    \tBalance\n`;
    // await respond({text :`Rank    Username    Balance`});    
  for(let x=0;x<Math.min(5,ar.length);x++)
  {
    if(x<5)
    {
      og+=`${x+1}\t\t\t${ar[x][1]}\t\t\t\t${ar[x][0]}\n`;
    }
    if(ar[x][2] == userID)
    {
      myrank=x+1;
    }
    // await respond({text :`${x+1}    ${ar[x][1]}   ${ar[x][0]}`});    
  }
  og+=`Your rank is ${myrank} with balance ${users[userID].balance}\n`;
  await respond({text: og});
  UpdateDataBase();
});

await app.start();
console.log("bot is running!");