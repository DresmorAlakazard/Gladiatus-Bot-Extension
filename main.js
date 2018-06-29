"use strict";

function idle() {
    var t;
    window.onload = resetTimer;
    window.onmousemove = resetTimer;
    window.onmousedown = resetTimer;  // catches touchscreen presses as well      
    window.ontouchstart = resetTimer; // catches touchscreen swipes as well 
    window.onclick = resetTimer;      // catches touchpad clicks as well
    window.onkeypress = resetTimer;   
    window.addEventListener('scroll', resetTimer, true); // improved; see comments

    function yourFunction() {
        location.reload(true);
    }

    function resetTimer() {
        clearTimeout(t);
        t = setTimeout(yourFunction, 1000 * 60 * 5);  // time is in milliseconds
    }
}
idle();


(async () => {
    try {
        let t0 = await storage("white_player_list");
        let t1 = await storage("white_guild_list");
        for (let i = 0; i < t0.length; ++i) if (t0[i] == "") t0.splice(i--, 1);
        for (let i = 0; i < t1.length; ++i) if (t1[i] == "") t1.splice(i--, 1);
        await storage("white_player_list", t0);
        await storage("white_guild_list", t1);
    } catch (exp) {}

    await initContent();
    await displayTodaysVictims();

    while (securehash) {
        let awaits = [ sleep(500) ];
        
        await loadProfile();

        if (profile.gatherMelts === undefined || profile.gatherMelts < Date.now()) {
            profile.gatherMelts = Date.now() + 1000 * 60 * 5; // Well... Not needed to check so recently. :)
            awaits.push(tryGatherForgeLoots());
        }

        if (canExpedition()) {
            awaits.push(get("ajax.php", {
                mod: "location",
                submod: "attack",
                location: element("exp_loc"),
                stage: element("exp_stage"),
                premium: 0
            }, [async (message, reject) => {
                console.log("Sent to expedition.");
                await get("index.php", { mod: "location" }, updateExpedition);
                reject(message);
            }]));
        }

        if (canDungeon()) {
            awaits.push(get("index.php", { mod: "dungeon", loc: element("dun_loc"), dif1: "Normál" }, async (message, reject) => {
                let fight = message.match(/startFight\(\'(\d+)\'\, \'(\d+)\'\)/i);
                if (fight != null) {
                    await get("ajax/doDungeonFight.php", { did: fight[2], posi: fight[1] }, (message) => {
                        console.log("Sent to dungeon.");
                    });
                    await get("index.php", { mod: "dungeon" }, updateDungeon);
                }
                reject(message);
            }));
        }

        if (canArena()) {
            profile.forcedArenaCooldown = Date.now() + 1000 * 60;

            awaits.push(new Promise(async (reject)=>{
                let requireNewOpponents = false;
                let fought = false;
                let list = [[],[],[] ];
                // Fill list
                let awaits = [
                    get("index.php", { mod: "arena" }, [async (message, reject) => {
                        let players = message.match(/<a href="index\.php\?mod=player&p=\d+&sh=\w+">[\*\w\-]+<\/a>/g);
                        let awaits = [];
                        for (let i = 0; i < players.length; ++i) {
                            let group = players[i].match(/<a href="index\.php\?mod=player&p=(\d+)&sh=\w+">([\*\w\-]+)<\/a>/i);
                            let id = group[1];
                            let name = group[2];
                            let server = server_id;
                            let country = server_country;
                            let cooldown = await storage("cooldown_" + profile.name + server + country + name);
                            if (cooldown === undefined || cooldown < Date.now()) {
                                awaits.push(new Promise(async (reject) => {
                                    let result = await simulateFight(server, country, name);
                                    if (result["win-chance"] >= parseInt(element("win_chance"))) {
                                        list[0].push({
                                            ["country"]: country,
                                            ["server"]: server,
                                            ["name"]: name,
                                            ["id"]: id
                                        });
                                    }
                                    reject();
                                }));
                            }
                        }
                        await Promise.all(awaits);
                        reject(message)
                    }]),
                    get("index.php", { mod: "arena", submod: "serverArena", aType: "2" }, [async (message, reject) => {
                        let players = message.match(/https:\/\/s\d+\-\w+.*p=\d+">\s+[\*\w\-]+\s+<\/a>/g);
                        let awaits = [];
                        let lose = 0;
                        for (let i = 0; i < players.length; ++i) {
                            let group = players[i].match(/https:\/\/s(\d+)\-(\w+).*p=(\d+)">\s+([\*\w\-]+)\s+<\/a>/i);
                            let server = group[1];
                            let country = group[2];
                            let id = group[3];
                            let name = group[4];
                            let cooldown = await storage("cooldown_" + profile.name + server + country + name);
                            if (cooldown === undefined || cooldown < Date.now()) {
                                awaits.push(new Promise(async (reject) => {
                                    let result = await simulateFight(server, country, name);
                                    if (result["win-chance"] >= parseInt(element("win_chance"))) {
                                        list[1].push({
                                            ["country"]: country,
                                            ["server"]: server,
                                            ["name"]: name,
                                            ["id"]: id
                                        });
                                    } else {
                                        ++lose;
                                    }
                                    reject();
                                }));
                            }
                        }
                        await Promise.all(awaits);
                        requireNewOpponents = lose == players.length;
                        reject(message);
                    }]),
                    get("index.php", { mod: "highscore", a: 4, d: 1, o: "l" }, [async (message, reject) => {
                        let players = message.match(/p=\d+&sh=\w+">[\*\w\-]+<\/a>/g);
                        let awaits = [];
                        for (let i = 0; i < players.length; ++i) {
                            let group = players[i].match(/p=(\d+)&sh=\w+">([\*\w\-]+)<\/a>/i);
                            let server = server_id;
                            let country = server_country;
                            let id = group[1];
                            let name = group[2];
                            let cooldown = await storage("cooldown_" + profile.name + server + country + name);
                            if (cooldown === undefined || cooldown < Date.now()) {
                                awaits.push(new Promise(async (reject) => {
                                    let result = await simulateFight(server, country, name);
                                    if (result["win-chance"] >= parseInt(element("win_chance"))) {
                                        list[2].push({
                                            ["country"]: country,
                                            ["server"]: server,
                                            ["name"]: name,
                                            ["id"]: id
                                        });
                                    }
                                    reject();
                                }));
                            }
                        }
                        await Promise.all(awaits);
                        reject(message);
                    }])
                ];
                await Promise.all(awaits);

                // Select victims
                const stuff = [
                    { url: "ajax/doArenaFight.php", needs: (id, name, server, country) => { return { did: id }; } },
                    { url: "ajax.php", needs: (id, name, server, country) => { return {
                        ["mod"]: "arena",
                        ["submod"]: "doCombat",
                        ["aType"]: 2,
                        ["opponentId"]: id,
                        ["serverId"]: server,
                        ["country"]: country
                    }; } },
                    { url: "ajax/doArenaFight.php", needs: (id, name, server, country) => { return { dname: name }; } },
                ];

                for (let i = 0; i < list.length; ++i) {
                    {
                        let order = list[i];
                        for (let a = 0; a < order.length; ++a) {
                            for (let b = 0; b < order.length; ++b) {
                                let pa = await foughtCount(order[a].name, order[a].id, order[a].server, order[a].country);
                                let pb = await foughtCount(order[b].name, order[b].id, order[b].server, order[b].country);
                                if (pa < pb) {
                                    order[a] = [order[b], order[b] = order[a]][0];
                                }
                            }
                        }
                        for (let a = 0; a < order.length; ++a) {
                            for (let b = 0; b < order.length; ++b) {
                                let pa = await storage("gold_earned" + order[a].name + order[a].server + order[a].country);
                                if (pa === undefined) pa = 0;
                                let pb = await storage("gold_earned" + order[b].name + order[b].server + order[b].country);
                                if (pb === undefined) pb = 0;
                                if (pa > pb) {
                                    order[a] = [order[b], order[b] = order[a]][0];
                                }
                            }
                        }
                        list[i] = order;
                    }

                    for (let j = 0; j < list[i].length; ++j) {
                        let player = list[i][j];
                        if (i != 1 && isPlayerOnWhiteList(player.id)) {
                            continue;
                        }
                        await get(stuff[i].url, stuff[i].needs(player.id, player.name, player.server, player.country), [async (message, reject) => {
                            let report = message.match(/index\.php\?(.*)&sh=/i);
                            
                            fought = report != null;

                            if (fought) {
                                await storage("cooldown_" + profile.name + player.server + player.country + player.name, Date.now() + 1000 * 60 * 3.6);
                                foughtCountInc(player.name, player.id, player.server, player.country);
                                console.log("Sent to arena.");

                                let params = { };
                                new URLSearchParams(report[1]).forEach((value, key)=>params[key]=value);
                                await get("index.php", params, async (message, reject)=>{
                                    let golds = message.match(/\d+\s*<img alt="" src="9247\/img\/res2\.gif"/g);
                                    let total = 0;
                                    if (golds) {
                                        for (let i = 0; i < golds.length; ++i) {
                                            total += parseInt(golds[i].match(/(\d+)\s*<img alt="" src="9247\/img\/res2\.gif"/i)[1]);
                                        }
                                        await storage("gold_earned" + player.name + player.server + player.country, total);
                                    } else {
                                        await storage("gold_earned" + player.name + player.server + player.country, 0);
                                    }
                                    await updateTodaysVictims(player.name, player.id, player.server, player.country, total);
                                    reject(message);
                                });

                                if (profile.workingLeft !== undefined && profile.workingLeft != 0) {
                                    --profile.workingLeft;
                                }
                            }
                            reject(message);
                        }]);
                        if (fought) break;
                    }
                    if (fought) break;
                }

                if (!fought && requireNewOpponents) {
                    await get("index.php", { mod: "arena", submod: "getNewOpponents", aType: 2, actionButton: "" }, ()=>{});
                }

                reject();
            }));
        }

        if (profile.costs !== undefined && element("skills_enabled")) {
            let skillsToUpgrade = [
                element("skills_strength"),
                element("skills_dexterity"),
                element("skills_agility"),
                element("skills_constitution"),
                element("skills_charisma"),
                element("skills_intelligence")
            ];
            let skillsName = [
                "Strength",
                "Dexterity",
                "Agility",
                "Constitution",
                "Charisma",
                "Intelligence"
            ];
            for (let i = 0; i < 6; ++i) {
                if (skillsToUpgrade[i] && profile.gold > profile.costs[i]) {
                    profile.gold -= profile.costs[i];
                    awaits.push(post("index.php", { mod: "training", submod: "train", skillToTrain: i + 1 }, (message) => {
                        updateSkills(message);
                        console.log(skillsName[i] + " upgraded.");
                    }));
                }
            }
        }

        if (profile.checkPantheon === true) {
            profile.checkPantheon = false;
            awaits.push(get("index.php", { mod: "quests" }, async (message, reject) => {
                updateGold(message);
                let listDone = message.match(/index\.php\?mod=quests&submod=finishQuest&questPos=\d+&sh=[\w\d]+/g);
                let localAwaits = [];
                if (listDone != null) {
                    for (let i = 0; i < listDone.length; ++i) {
                        localAwaits.push(get(listDone[i], { }, updateGold));
                    }
                    await Promise.all(localAwaits);
                }
                reject(message);
            }));
        }

        await Promise.all(awaits);

        if (canWork()) {
            await get("index.php", { mod: "work", submod: "start", jobType: "2", timeToWork: element("work_hours") }, (message) => {
                updateWork(message);
                console.log("Sent to work.");
            });
        }

        await storage("bot_profile", profile);
    }

    content.remove();
})();