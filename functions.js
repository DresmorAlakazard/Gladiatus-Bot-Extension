"use strict";

function getSecureHash(source) {
    let result = source.match(/submod=logout&amp;sh=([\w\d]+)/i);
    return result ? result[1] : false;
}

function setSecureHash(source) {
    let result = getSecureHash(source);
    return result ? securehash = result : securehash;
}

async function sleep(ms) {
    return new Promise((reject)=>setTimeout(()=>reject(),ms));
}

/*
async function get(url, data, callback, dataType) {
    if (data === undefined) data = { };
    if (callback === undefined) callback = ()=>{ };
    return new Promise((reject)=>$.get(url, (data.sh = securehash, data), (message)=>(setSecureHash(message), callback(message), reject(message)), dataType).fail(()=>reject(false)));
}

async function post(url, data, callback, dataType) {
    if (data === undefined) data = { };
    if (callback === undefined) callback = ()=>{};
    return new Promise((reject)=>$.post(url, (data.sh = securehash, data), (message)=>(setSecureHash(message), callback(message), reject(message)), dataType).fail(()=>reject(false)));
}
*/

async function httprq(type, url, data, callback, dataType) {
    if (data === undefined) data = { sh: securehash }; else data.sh = securehash;
    if (callback === undefined) callback = () => { };
    let func = type == "get" ? $.get : $.post;
    return new Promise(
        (reject) => func(
            url,
            data,
            (message) => {
                setSecureHash(message);
                if (typeof callback == "object") {
                    callback[0](message, reject);
                } else if (callback instanceof (async()=>{}).constructor) {
                    callback(message, reject);
                } else {
                    callback(message);
                    reject(message);
                }
            },
            dataType
        )
    );
}

async function get(url, data, callback, dataType) { return httprq("get", url, data, callback, dataType); }
async function post(url, data, callback, dataType) { return httprq("post", url, data, callback, dataType); }

async function storage(key, value) {
    key = toString(server_id) + server_country + key;
    if (isChromium) {
        if (value === undefined) {
            return new Promise((reject)=>chrome.storage.local.get([key], (result)=>reject(result[key])));
        } else {
            return new Promise((reject)=>chrome.storage.local.set({ [key]: value }, ()=>reject()));
        }
    } else {
        if (value === undefined) {
            return new Promise((reject)=>reject(JSON.parse(localStorage[key])));
        } else {
            return new Promise((reject)=>reject((localStorage[key] = JSON.stringify(value), undefined)));
        }
    }
}

function input(item, value) {
    if (value === undefined) {
        return item.type == "checkbox" ? item.checked : item.value;
    } else {
        if (item.type == "checkbox") {
            item.checked = value;
        } else {
            item.value = value;
        }
    }
}

async function isPlayerOnWhiteList(id) {
    let info = await storage("local_player_info_7_" + id);
    if (!info || info.nextUpdate < Date.now()) {
        info = { nextUpdate: Date.now() + 1000 * 60 * 60 * 12 };
        let message = await get("index.php", { mod: "player", p: id, doll: 1 });
        let name = message.match(/playername.*>\s*?([\-\*\w]+)/i);
        if (name) name = name[1]; else return false;
        let guild = message.match(/index\.php\?mod=guild.*">(.*) \[(.*)\]/i);
        info.name = name.toLowerCase();
        info.full = (guild ? guild[1] : "").toLowerCase();
        info.sign = (guild ? guild[2] : "").toLowerCase();
        await storage("local_player_info_7_" + id, info);
    }
    let table0 = await storage("white_player_list");
    let table1 = await storage("white_guild_list");
    let tables = [table0?table0:[],table1?table1:[]];
    for (let i = 0; i < tables.length; ++i) {
        for (let j = 0; j < tables[i].length; ++j) {
            let val = tables[i][j].toLowerCase();
            if (i == 0 && val == info.name) return true;
            else if (i == 1 && info.full && (val == info.full || val == info.sign)) return true;
        }
    }
    return false;
}

function param(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function element(path, value) {
    return input(content.find("#bot_" + path)[0], value);
}

function isWorking() {
    return profile.workExpire > Date.now();
}

function canDungeon() {
    return !isWorking() && (profile.dungeonExpire < Date.now()) && (profile.dungeonPoints > element("dun_max")) && element("dun_enabled");
}

function canExpedition() {
    return !isWorking() && (profile.expeditionExpire < Date.now()) && (profile.expeditionPoints > element("exp_max")) && element("exp_enabled") && profile.healthPercentage > 30;
}

function canArena() {
    return !isWorking() && (profile.arenaExpire < Date.now()) && element("arena_enabled") && profile.arenaExpire < Date.now() && (profile.forcedArenaCooldown ? profile.forcedArenaCooldown < Date.now() : true) && profile.healthPercentage > 30;
}

function canWork() {
    return !isWorking() && (!(profile.dungeonPoints > element("dun_max")) || !element("dun_enabled")) && (!(profile.expeditionPoints > element("exp_max")) || !element("exp_enabled")) && !canArena() && element("work_enabled") && (profile.workingLeft === undefined || profile.workingLeft == 0 || profile.healthPercentage < 30 || element("arena_enabled") == false);
}

async function updateTodaysVictims(name, id, server, country, goldEarned) {
    if (server != server_id || country != server_country) return;
    let table = await storage("_victims_");
    if (table === undefined) table = [ ];
    let index;
    for (index = 0; index < table.length; ++index) {
        let info = table[index];
        if (info.name == name && info.id == id && info.server == server && info.country == country) break;
    }
    if (index == table.length) {
        table.push({
            ["id"]: id,
            ["name"]: name,
            ["server"]: server,
            ["country"]: country,
            ["gold"]: 0
        });
    }
    table[index].gold += goldEarned;
    await storage("_victims_", table);
    await displayTodaysVictims(table);
}

async function displayTodaysVictims(table) {
    if (!table) return;
    let order;
    if (table) order = table; else order = await storage("_victims_");
    for (let a = 0; a < order.length; ++a) {
        for (let b = 0; b < order.length; ++b) {
            if (order[a].gold > order[b].gold) {
                order[a] = [order[b], order[b] = order[a]][0];
            }
        }
    }
    $("#bot_victims").html("");
    for (let i = 0; i < order.length; ++i) {
        let info = order[i];
        let adaptive = info.server == server_id ? "&sh=" + securehash : "";
        $(`
            <div>
            <label style="overflow: hidden; width: 50%;"><a href="` + "https://s" + info.server + "-" + info.country + ".gladiatus.gameforge.com/game/index.php?mod=player&p=" + info.id + adaptive + `" target="_black"><b>` + info.name + `</b></a></label>
            <label style="overflow: hidden; width: calc(50% - 32px);">` + info.gold + `</label>
            <img src="9247/img/res2.gif">
            </div>
        `).appendTo("#bot_victims");
    }
}

async function tryGatherForgeLoots() {
    let awaits = [
        await get("ajax.php", { mod: "forge", submod: "lootbox", mode: "smelting", slot: 0 }),
        await get("ajax.php", { mod: "forge", submod: "lootbox", mode: "smelting", slot: 1 })
    ];
    await Promise.all(awaits);
}

function updateGold(message) {
    profile.gold = message.match(/sstat_gold_val\"\>(.+)\</i);
    profile.gold = profile.gold != null ? parseInt(profile.gold[1].replace("\.", "")) : 0;
    profile.healthPercentage = message.match(/<div id="header_values_hp_percent" class="header_values_bar_percent">(\d+)/i);
    profile.healthPercentage = profile.healthPercentage ? parseInt(profile.healthPercentage[1]) : 0;
}

function updateWork(message) {
    updateGold(message);

    let timeData = message.match(/data-ticker-time-left=\"([0-9]+)\"/i);
    if (timeData) profile.workExpire = Date.now() + parseInt(timeData[1]);
    else profile.workExpire = 0;

    if (isWorking()) profile.workingLeft = element("arena_count");
}

function updateArena(message) {
    updateGold(message);
    profile.arenaExpire = message.match(/data-ticker-time-left=\"([0-9]+)\"/i);
    profile.arenaExpire = profile.arenaExpire != null ? Date.now() + parseInt(profile.arenaExpire[1]) : 0;
}

function updateSkills(message) {
    updateGold(message);
    profile.costs = [
        Number.MAX_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER
    ];
    let costs = message.match(/training_costs"\>\s*?([\d\.]+)\s*?\</g);
    if (costs) {
        for (let i = 0; i < costs.length; ++i) {
            profile.costs[i] = costs[i].replace(/\D/g, "");
        }
    }
}

function updateDungeon(message) {
    updateGold(message);
    profile.dungeonPoints = message.match(/dungeonpoints_value_point\"\>([0-9]+)/i);
    profile.dungeonPoints = profile.dungeonPoints != null ? parseInt(profile.dungeonPoints[1]) : Number.MAX_SAFE_INTEGER;
    profile.dungeonExpire = message.match(/data-ticker-time-left=\"([0-9]+)\"/i);
    profile.dungeonExpire = profile.dungeonExpire != null ? Date.now() + parseInt(profile.dungeonExpire[1]) : 0;
}

function updateExpedition(message) {
    updateGold(message);
    profile.expeditionPoints = message.match(/expeditionpoints_value_point\"\>([0-9]+)/i);
    profile.expeditionPoints = profile.expeditionPoints != null ? parseInt(profile.expeditionPoints[1]) : Number.MAX_SAFE_INTEGER;
    profile.expeditionExpire = message.match(/data-ticker-time-left=\"([0-9]+)\"/i);
    profile.expeditionExpire = profile.expeditionExpire != null ? Date.now() + parseInt(profile.expeditionExpire[1]) : 0;
}

function updateNameID(message) {
    try {
        profile.id = message.match(/p=(\d+)/i)[1];
        profile.name = message.match(/playername ellipsis">\n\s*([\w\*\-]+)/i)[1];
    } catch (e) { }
}

async function loadProfile() {
    let first_load = profile === undefined;
    if ((profile = profile ? profile : await storage("bot_profile")) === undefined || profile.nextUpdate < Date.now()) {
        profile = profile ? profile : { };
        profile.nextUpdate = Date.now() + 1000 * 60;
        profile.checkPantheon = true;
        profile.workingLeft = profile.workingLeft !== undefined ? profile.workingLeft : parseInt(element("arena_count"));
        await Promise.all([
            get("index.php", { mod: "work" }, updateWork),
            get("index.php", { mod: "arena" }, updateArena),
            get("index.php", { mod: "dungeon" }, updateDungeon),
            get("index.php", { mod: "training" }, updateSkills),
            get("index.php", { mod: "location" }, updateExpedition),
            get("index.php", { mod: "overview", doll: 1 }, updateNameID)
        ]);
        await storage("bot_profile", profile);
    } else if (first_load && param("mod")) {
        switch (param("mod")) {
            case "work": updateWork($("body").html()); break;
            case "arena": updateArena($("body").html()); break;
            case "dungeon": updateDungeon($("body").html()); break;
            case "training": updateSkills($("body").html()); break;
            case "location": updateExpedition($("body").html()); break;
            case "overview": { if (param("doll") == "1") updateNameID($("body").html()); } break;
            default: updateGold($("body").html());
        }
    }
}

function getServerCountry(url) {
    return {
        id: url.match(/s(\d+)[\-\.](\w+)/i)[1],
        country: url.match(/s(\d+)[\-\.](\w+)/i)[2]
    };
}

async function simulateFight(server, country, name) {
    let path = server_country + server_id + profile.name + country + server + name;
    let result = await storage(path);

    if (result && result.nextUpdate !== undefined && result.nextUpdate > Date.now()) {
        return new Promise((reject)=>reject(result));
    }

    return new Promise((reject)=>{
        $.ajax({
            dataType : "json",
            url : "https://gladiatussimulator.tk/monkey-brain/arena.json",
            // Players' Data
            data : {
                "a-country" : server_country,
                "a-server" : server_id,
                "a-name" : profile.name,
                "d-country" : country,
                "d-server" : server,
                "d-name" : name,
                "timestamp" : Date.now()
            },
            // Callback Function
            success: (json) => {
                json.nextUpdate = Date.now() + 1000 * 60 * 15;
                if (server == server_id && country == server_country) storage(path, json);
                reject(json);
            },
            error: reject
        });
    });
}

async function foughtCount(name, id, server, country, value) {
    if (server != server_id || country != server_country) return 0;
    if (value === undefined) {
        return await storage(["fought", name, id, server, country].join("_"));
    } else {
        await storage(["fought", name, id, server, country].join("_"), value);
    }
}

async function foughtCountInc(name, id, server, country, value) {
    if (server != server_id || country != server_country) return;
    await storage(["fought", name, id, server, country].join("_"), await storage(["fought", name, id, server, country].join("_")) + (value === undefined ? 1 : value));
}

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}