"use strict";

$(`
<style type="text/css">
    #bot_content {
        width: 200px;
        height: auto;
        position: fixed;
        background-color: #afafaf;
        z-index: 20000;
        opacity: 0.95;
        overflow-y: auto;
    }
    #bot_content * {
        opacity: 0.95;
    }
    #bot_content label {
        margin: 0;
        padding: 0;
        width: 50%;
        display: inline-block;
        color: black;
    }
    #bot_content input {
        margin: 0;
        padding: 0;
        width: 45%;
        display: inline-block;
        color: initial;
        border: initial;
        background-color: white;
        vertical-align: middle;
    }
    #bot_content fieldset {
        color: black;
    }
    #bot_victims {
        max-height: 400px;
    }
    #bot_content a {
        color: black;
    }
    #bot_expand {
        overflow: hidden;
    }
</style>
`).appendTo("head");

content =
$(`
<div id="bot_content">
    <fieldset>
        <label>Lock: <input id="bot_lock_enabled" type="checkbox" style="width: initial;"></label>
        <label>Right: <input id="bot_snap_right" type="checkbox" style="width: initial; checked"></label>
        <button id="bot_reset">Reset</button>
    </fieldset>
    <fieldset>
        <legend>Expedition</legend>
        <div class="bot_expand" name="exp">
        <label>Enabled:</label><input id="bot_exp_enabled" type="checkbox" style="width: initial;"><br>
        <label>Max:</label><input id="bot_exp_max" type="number" min="0" max="12" value="0"><br>
        <label>Location:</label><input id="bot_exp_loc" type="number" min="0" max="7" value="0"><br>
        <label>Stage:</label><input id="bot_exp_stage" type="number" min="1" max="4" value="1">
        </div>
    </fieldset>
    <fieldset>
        <legend>Dungeon</legend>
        <div class="bot_expand" name="dun">
        <label>Enabled:</label><input id="bot_dun_enabled" type="checkbox" style="width: initial;"><br>
        <label>Max:</label><input id="bot_dun_max" type="number" min="0" max="12" value="0"><br>
        <label>Location:</label><input id="bot_dun_loc" type="number" min="0" max="6" value="0"><br>
        </div>
    </fieldset>
    <fieldset>
        <legend>Working</legend>
        <div class="bot_expand" name="work">
        <label>Enabled:</label><input id="bot_work_enabled" type="checkbox" style="width: initial;"><br>
        <label>Hours:</label><input id="bot_work_hours" type="number" min="1" max="8" value="1"><br>
        </div>
    </fieldset>
    <fieldset>
        <legend>Skills</legend>
        <div class="bot_expand" name="skills">
        <label>Enabled:</label><input id="bot_skills_enabled" type="checkbox" style="width: initial;"><br>
        <label>Strength:</label><input id="bot_skills_strength" type="checkbox" style="width: initial;"><br>
        <label>Dexterity:</label><input id="bot_skills_dexterity" type="checkbox" style="width: initial;" checked><br>
        <label>Agility:</label><input id="bot_skills_agility" type="checkbox" style="width: initial;" checked><br>
        <label>Constitution:</label><input id="bot_skills_constitution" type="checkbox" style="width: initial;"><br>
        <label>Charisma:</label><input id="bot_skills_charisma" type="checkbox" style="width: initial;" checked><br>
        <label>Intelligence:</label><input id="bot_skills_intelligence" type="checkbox" style="width: initial;"><br>
        </div>
    </fieldset>
    <fieldset>
        <legend>Arena</legend>
        <div class="bot_expand" name="arena">
        <label>Enabled:</label><input id="bot_arena_enabled" type="checkbox" style="width: initial;"><br>
        <label>Win chance:</label><input id="bot_win_chance" type="number" min="0" max="100" step="1" value="80"><br>
        <label>Before work:</label><input id="bot_arena_count" type="number" step="1" min="0" value="0"><br>
            <fieldset>
                <legend>White players</legend>
                <div class="bot_expand" name="white_player" data-white=true data-player=true>
                    <input id="white_player_list_input" style="width: 100%; margin-bottom: 4px;" value="Player-name">
                    <div id="white_player_list_container" style="overflow-y: auto; max-height: 150px;"></div>
                </div>
            </fieldset>
            <fieldset>
                <legend>White guilds</legend>
                <div class="bot_expand" name="white_guild" data-white=true data-guild=true>
                    <input id="white_guild_list_input" style="width: 100%; margin-bottom: 4px;" value="Guild-name">
                    <div id="white_guild_list_container" style="overflow-y: auto; max-height: 150px;"></div>
                </div>
            </fieldset>
        </div>
    </fieldset>
    <fieldset>
        <legend>Description</legend>
        <label style="width: 100%">Made by <a href="https://www.facebook.com/Dresmor" target="_blank"><b>Dresmor Alakazard</b></a>.</label>
    </fieldset>
    <fieldset>
        <legend>Victims of the day</legend>
        <div class="bot_expand" name="victims">
        <div id="bot_victims" style="overflow-y: auto; max-height: 200px;">
        </div>
        </div>
    </fieldset>
</div>
`).appendTo("body");

async function displayWhiteList(player) {
    let table = await storage(player ? "white_player_list" : "white_guild_list");
    let container = $("#bot_content").find(player ? "#white_player_list_container" : "#white_guild_list_container");
    if (table && container[0]) {
        container.html("");
        for (let i = 0; i < table.length; ++i) {
            $(`
                <label style="width: 20px; margin-left: 3px; display: block; cursor: pointer;" data-player=` + player + ` data-wlremoval=true data-listindex=` + i + `><b>` + table[i] + `</b></label>
            `).appendTo(container).bind("click", async (event)=>{
                let item = $(event.target).parent();
                if (item.data("wlremoval")) {
                    let table = await storage(item.data("player") ? "white_player_list" : "white_guild_list");
                    table.splice(parseInt(item.data("listindex")), 1);
                    await storage(item.data("player") ? "white_player_list" : "white_guild_list", table);
                    await displayWhiteList(item.data("player"));
                }
            });
        }
    }
}

async function initContent() {
    let left_hide = "-180px";
    let left_show = "0px";
    let right_hide = "calc(100% - 20px)";
    let right_show = "calc(100% - 200px)";
    let inside = false;

    function updatePosition() {
        let hide = !(element("lock_enabled") || inside);
        let posx = !element("snap_right") ? (hide ? left_hide : left_show) : (hide ? right_hide : right_show);
        let posy = Math.abs(Math.min(window.pageYOffset - 32, 0));
        content.css({
            left: posx,
            top: posy,
            "max-height": "calc(100% - " + posy + "px)"
        });
    }

    let awaits = [];
    content.find("input").each((_, item)=>{
        awaits.push(new Promise(async (reject)=>{
            let value = await storage(item.id);
            input(item, value);
            $(item).bind("change", ()=>{
                storage(item.id, input(item));
            });
            reject();
        }));
    });
    await Promise.all(awaits);

    if (isChromium) {
        content.find("#bot_reset").bind("click", ()=>{
            chrome.storage.local.clear();
        });
    } else {
        content.find("#bot_reset").remove();
    }

    content.find(".bot_expand").each(async (_, item)=>{
        let child = $(item);
        let parent = child.parent();
        $(parent.find("legend")[0]).css("cursor", "pointer");
        $(parent.find("legend")[0]).bind("click", (function BEE_001 (event){
            (async ()=>{
                if (event) {
                    await storage("_toggle_" + child.attr("name"), !await storage("_toggle_" + child.attr("name")));
                }
                child.css("display", await storage("_toggle_" + child.attr("name")) ? "initial" : "none");
                parent.css("height", await storage("_toggle_" + child.attr("name")) ? "initial" : "10px");
            })();
            return BEE_001;
        })());
        if (child.data("white")) {
            let table_name = child.data("player") ? "white_player_list" : "white_guild_list";
            child.first().bind("keyup", async (event)=>{
                if (event.key.toLowerCase() != "enter") return;
                if (event.target.value == "") return;
                let table = await storage(table_name);
                table = table ? table : [ ];
                let name = event.target.value.toLowerCase().substr(0, 30);
                let i;
                for (i = 0; i < table.length; ++i) {
                    if (table[i] == name) {
                        break;
                    }
                }
                if (i == table.length) table.push(name);
                await storage(table_name, table);
                if (i == table.length - 1) await displayWhiteList(child.data("player") ? true : false);
            });
        }
    });

    updatePosition();
    content.bind("mouseout mouseover", (event)=>(inside = event.type == "mouseover", updatePosition()));
    $(window).bind("scroll", updatePosition);
    content.find("#bot_snap_right").bind("change", updatePosition);
    content.find("#bot_arena_enabled").bind("change", ()=>profile.forcedArenaCooldown = 0);
    content.find("#bot_arena_count").bind("change", (event)=>profile.workingLeft=parseInt(event.target.value));

    await displayWhiteList(true);
    await displayWhiteList(false);
}