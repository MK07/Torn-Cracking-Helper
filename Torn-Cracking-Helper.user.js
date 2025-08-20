// ==UserScript==
// @name         Torn Cracking Helper
// @namespace    https://github.com/MK07/Torn-Cracking
// @version      1.0
// @description  Use dictionary based guessing to solve the passwords
// @author       MK07
// @match        https://www.torn.com/page.php?sid=crimes*
// @grant        GM_getValue
// @grant        GM.getValue
// @grant        GM_setValue
// @grant        GM.setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/MK07/Torn-Cracking-Helper/refs/heads/main/Torn%20Cracking%20Helper.user.js
// @updateURL    https://raw.githubusercontent.com/MK07/Torn-Cracking-Helper/refs/heads/main/Torn%20Cracking%20Helper.user.js
// ==/UserScript==

(function () {
    'use strict';

    // Avoid duplicate injection
    if (window.CRACK_HELPER_INJECTED) {
      return;
    }
    window.CRACK_HELPER_INJECTED = true;

    const cracker_record = {};
    const filter_history = {};

    const isMobile = () => {
        return window.innerWidth <= 768;
    }

    let inPDA = false;
    const PDAKey = "###PDA-APIKEY###";
    if(PDAKey.charAt(0) !== "#"){
        inPDA = true;
    }

    const http_get = (url, success, failed)=>{
        GM_xmlhttpRequest({
            method: "get",
            url: url,
            timeout: 30000,
            ontimeout: (err) => {
                failed(err);
            },
            onerror: (err) => {
                failed(err);
            },
            onload: (res) => {
                success(res);
            }
        });
    }

    // ========================= Configuration==============================================================================================================================
    const CRACKER_STATUS_KEY = "CRACKER_STATUS";
    const defaultSel = isMobile() ? "100k" : "1m";
    let CRACKER_SEL = localStorage.getItem(CRACKER_STATUS_KEY) || defaultSel;
    const LIMIT = 10;
    // add custom password list here, and set CRACKER_SEL to the one you want to choose
    const PASSWORD_DATABASE = {
    "10m": "https://raw.githubusercontent.com/MK07/Torn-Cracking-Helper/main/dictionaries/10m.txt",
    "1m": "https://raw.githubusercontent.com/MK07/Torn-Cracking-Helper/main/dictionaries/1m.txt",
    "100k": "https://raw.githubusercontent.com/MK07/Torn-Cracking-Helper/main/dictionaries/100k.txt",
    "10k": "https://raw.githubusercontent.com/MK07/Torn-Cracking-Helper/main/dictionaries/10k.txt",
    "1k": "https://raw.githubusercontent.com/MK07/Torn-Cracking-Helper/main/dictionaries/1k.txt",
    "Custom": "https://raw.githubusercontent.com/MK07/Torn-Cracking-Helper/main/dictionaries/Custom.txt"
    };
    // =====================================================================================================================================================================

    window.CRACK_HELPER_INJECTED = true;

    if (GM) {
        window.GM_getValue = GM.getValue;
        window.GM_setValue = GM.setValue;
    }

    if(!PASSWORD_DATABASE[CRACKER_SEL]){
        console.log("Fail to fetch cracker password");
        return;
    }
    const CRACKER_HELPER_KEY = "CRACKER_HELPER_STORAGE";

    let cracker_helper = {
        "source": "",
        "data": [],
    }

    let titleInterval, updateInterval;
    let is_injected = false;

    const setCrackTitle = (title)=>{
        if(titleInterval){
            clearInterval(titleInterval);
        }
        titleInterval = setInterval(()=>{
            if($('div[class*=header___] div[class*=title___]').length > 0){
                $('div[class*=header___] div[class*=title___]').text(`CRACKING(${title})`)
                clearInterval(titleInterval);
                titleInterval = undefined;
            }
        }, 1000)
    }

    const fetch_action = (useCache=true)=>{
        setCrackTitle("Loading from network");
        http_get(PASSWORD_DATABASE[CRACKER_SEL],
            (res)=>{
                const text = res.responseText;
                cracker_helper.data = [];
                text.split('\n').forEach((pwd)=>{
                    cracker_helper.data.push(pwd.trim().replace('\n', ''));
                });
                cracker_helper.source = PASSWORD_DATABASE[CRACKER_SEL];
                if(useCache){
                    GM_setValue(CRACKER_HELPER_KEY, cracker_helper);
                }
                setCrackTitle("Loaded")
                updatePage();

                console.log('load cracker_helper from network:')
                console.log(cracker_helper)
            },
            (res)=>{
                console.error(`error: ${res}`);
            }
        )
    }

    const insertSelector = ()=>{
        let options = "";
        for(let abbr in PASSWORD_DATABASE){
            options += `<option value="${abbr}">${abbr}</option>`
        }

        const selector = $(`
            <div class="cracker-helper-selector">
                <label>Source:</label>
                <select name="crackerSel">
                    ${options}
                </select>
                <button class="torn-btn" id="crack-update">Update page</button>
            </div>
        `)
        selector.find("select").val(CRACKER_SEL);

        selector.find("button").click(function(){
           updatePage();
        })

        selector.find("select").change(function(){
            CRACKER_SEL = $(this).val();
            localStorage.setItem(CRACKER_STATUS_KEY, CRACKER_SEL);
            $("div.cracker-helper-panel").each(function(){
                $(this).remove();
            })
            fetch_action();
        })

        if($("div.cracker-helper-selector").length == 0){
            $("h4[class*=heading___]").after(selector);
        }
    }

    const addStyle = ()=>{
        const styles = `
            .cracker-helper-selector{
                display: flex;
                align-items: center;
                font-size: 14px;
                font-weight: bold;
            }
            .cracker-helper-selector select{
                background: transparent;
                text-align: center;
                border: none;
            }
            .dark-mode .cracker-helper-selector select{
                color: #F2F2F2 !important;
            }
            .dark-mode .cracker-helper-selector select option{
                background: #333 !important;
                color: #F2F2F2 !important;
            }
            .cracker-helper-panel{
                width: 100%;
                height: 30px;
                background: #F2F2F2;
                box-sizing: border-box;
                display: flex;
                padding: 5px;
                border-bottom: 1px solid rgba(1, 1, 1, .1);
            }
            .cracker-helper-panel:hover{
                background: #FFF;
            }
            .dark-mode .cracker-helper-panel{
                background: rgba(1, 1, 1, .15) !important;
                border-bottom: 1px solid #222 !important;
            }
            .dark-mode .cracker-helper-panel:hover{
                background: rgba(1, 1, 1, .15) !important;
            }

            .cracker-current-status{
                display: flex;
                flex-flow: column nowrap;
                border-right: 1px solid;
                border-image-source: linear-gradient(180deg,transparent,#ddd 53%,transparent);
                border-image-slice: 1;
                box-sizing: border-box;
                justify-content: center;
                padding-left: 5px;
            }
            .dark-mode .cracker-current-status{
                border-image-source: linear-gradient(180deg,transparent,#000,transparent);
            }
            .cracker-helper-panel-mobile .cracker-current-status{
                fotn-size: 5px !important;
            }
            .cracker-current-status div{
                width: 100%;
                color: #000;
                font: inherit;
                color: #666;
            }
            .cracker-status-count{
                color: #c66231 !important;
            }
            .cracker-current-result{
                flex: 1;
                display: flex;
                align-items: center;
                border-right: 1px solid;
                border-image-source: linear-gradient(180deg,transparent,#ddd 53%,transparent);
                border-image-slice: 1;
                box-sizing: border-box;
                padding-left: 5px;
                font-size: 1.25em;
            }
            .dark-mode .cracker-current-result{
                border-image-source: linear-gradient(180deg,transparent,#000,transparent);
            }
            .cracker-result-item{
                border: 1px solid rgba(1, 1, 1, .1);
                height: 34px;
                line-height: 34px;
                font-size: 100%;
                text-align: center;
                margin-left: 6px;
                box-sizing: border-box;
            }
            .dark-mode .cracker-result-item{
                border-color: #F2F2F266 !important;
            }
            .cracker-helper-panel-mobile .cracker-result-item{
                margin-left: 3px !important;
            }

            .cracker-button-set{
                display: flex;
                flex-flow: row nowrap;
                justify-content: space-between;
                align-items: center;
                box-sizing: border-box;
                padding-right: 5px;
            }
            .cracker-helper-panel-mobile .cracker-button-set{
                flex-flow: column nowrap !important;
            }
            .cracker-button-set button{
                text-align: center;
                height: 16px;
                line-height: 16px;
            }
            .cracker-button-set button:active{
                height: 16px !important;
                line-height: 16px !important;
            }
            .cracker-helper-panel-mobile .cracker-button-set button{
                width: 60px;
                height: 18px !important;
                line-height: 18px !important;
            }
        `;
        const isTampermonkeyEnabled = typeof unsafeWindow !== 'undefined';
        if (isTampermonkeyEnabled){
            GM_addStyle(styles);
        } else {
            let style = document.createElement("style");
            style.type = "text/css";
            style.innerHTML = styles;
            document.head.appendChild(style);
        }
    }

    // under experiment
    const findCommonCandidates = (arr, target)=>{
        if(arr.length === 0){
            return arr;
        }
        const target_poses = [];
        for(let i = 0; i < target.length; i++){
            const c = target[i];
            if(c == "."){
                target_poses.push(i);
            }
        }

        const freqs = [];
        for(let pos of target_poses){
            const freq = {};
            for(let res of arr){
                const c = res[pos];
                if(!freq[c]){
                    freq[c] = 0;
                }
                freq[c] += 1;
            }
            const freq_list = Object.entries(freq);
            freq_list.sort((a, b)=>{
                if(a[1] > b[1]){
                    return -1;
                } else if(a[1] < b[1]){
                    return 1;
                }
                return 0;
            });
            freqs.push({
                pos: pos,
                char: freq_list[0][0],
                count: freq_list[0][1]
            });
        }

        freqs.sort((a, b)=>{
            if(a["count"] > b["count"]){
                return -1;
            } else if(a["count"] < b["count"]){
                return 1;
            }
            return 0;
        });

        const res = [];
        const highest = freqs[0];
        const highest_pos = highest["char"];
        const highest_char = highest["pos"];
        for(let c of arr){
            if(c[highest_pos] === highest_char){
                res.unshift(c);
            } else{
                res.push(c);
            }
        }
        return {
            res,
            highest_pos,
            highest_char
        }
    }

    let indexMap = {};

    let global_index = 0;
    const handleCrime = (item, extraInfo=undefined, panel_index=undefined)=>{
        console.log("handle crime");
        let index = panel_index;
        if(index){
           index = parseInt(index);
        }
        if (indexMap[panel_index] == undefined) {
            console.log("resetting index", panel_index);
            indexMap[panel_index] = 0;
        }
        let target = "";
        if(extraInfo){
            target = extraInfo;
        }
        else{
            item.find("div[class*=charSlot_]").each(function(){
                const val = $(this).text().trim();
                if(val == ""){
                    target += "."
                }else{
                    target += val;
                }
            });
        }

        target = target.replaceAll("ø", "0");
        let targetRegex = new RegExp(`^${target}$`);

        // console.log(`target Regex is ${targetRegex}, index is ${index}, globalIndex: ${global_index}`);

        setCrackTitle("Calculating");

        let result = cracker_helper.data.filter(item => targetRegex.test(item));

        if(result.length === 0 && target.length > 6){
            let found = false;
            let splitIndex = 3;
            // when regex match does not work, we will split the regex and try to find out result for both side
            while(!found && splitIndex < 7 && splitIndex < target.length - 1){
                const regexLeft = new RegExp(`^${target.substring(0, splitIndex)}$`);
                const regexRight = new RegExp(`^${target.substring(splitIndex)}$`);

                splitIndex += 1;
                const leftResult = cracker_helper.data.filter(item => regexLeft.test(item));
                const rightResult = cracker_helper.data.filter(item => regexRight.test(item));

                if(leftResult.length > 0 && rightResult.length > 0){
                    const minSize = Math.min(leftResult.length, rightResult.length);
                    result = leftResult.map((item, index)=>{
                        if(index < minSize){
                            return item + rightResult[index];
                        }
                    }).filter(item => item !== undefined);

                    if(result.length > 10){
                        found = true;
                    }
                }
            }
        }

        if(filter_history[index]){
            result = result.filter((item)=>{
                for(let history of filter_history[index]){
                    const char = history.char;
                    const charPos = history.charPos;
                    if(item && item[charPos] === char){
                        return false;
                    }
                }
                return true;
            })
        }

        result = result.slice(0, LIMIT);
        console.log(result);

        if(result.length > 0){
            if(index){
                cracker_record[index] = result;
            }
            else{
                cracker_record[global_index] = result;
            }
        }

        setCrackTitle("Done");

        const counter = $(`<p></p>`);

        const updateResults = () => {
            const result_index = indexMap[panel_index] % result.length;
            counter.text(`${result_index+1}/${result.length}`);
            let i = 0;
            item.find("div[class*=charSlot_]").each(function() {
                    var inputs = $(this).find("div[class*=inputMarker]")
                    $(this).css('color', '');
                    if(inputs.length > 0) {

                        inputs.each(function() {
                            $(this).text('');
                            $(this).css('color', '');
                        });
                    }
                });

            item.find("div[class*=inline-crime-helper-elemet]").each(function(){
                $(this).remove();
            })

            if (result.length > 0) {
                item.find("div[class*=charSlot_]").each(function() {
                    var inputs = $(this).find("div[class*=inputMarker]")
                    if(inputs.length > 0) {

                        inputs.each(function() {
                            $(this).text(result[result_index][i]);
                            $(this).css('color', 'gray');
                        });
                    } else if ($(this).text() == "") {
                        $(this).append($(`<div class="inline-crime-helper-elemet">${result[result_index][i]}</div>`));
                        //$(this).text(result[0][i]);
                        $(this).css('color', 'gray');
                    } else {
                        $(this).css('color', '');
                    }
                    i++;
                });
            } else {
                item.find("div[class*=charSlot_]").each(function() {
                    var inputs = $(this).find("div[class*=inputMarker]")
                    $(this).css('color', '');
                    if(inputs.length > 0) {

                        inputs.each(function() {
                            $(this).text('');
                            $(this).css('color', '');
                        });
                    }
                });
            }
        };

        updateResults();

        const buttons_section = item.find("div[class*=commitButtonSection]")
        $(buttons_section).find('.cracker-button-set').remove();

        const next_prev = $(`
                        <div class="cracker-button-set">
                        </div>
        `);
        const next = $('<button class="torn-btn" aria-label="next">Next</button>');
        const prev = $('<button class="torn-btn" aria-label="prev">Prev</button>');
        next_prev.append(prev);
        next_prev.append(counter);
        next_prev.append(next);
        next.click(function() {
            indexMap[panel_index] = indexMap[panel_index] + 1;
            console.log(indexMap);
            updateResults();
        });
        prev.click(function() {
            indexMap[panel_index] = Math.max(indexMap[panel_index] - 1, 0);
            updateResults();
        });

        $(buttons_section).append(next_prev);
        $(buttons_section).css("grid-auto-flow", "row");
    }

    const handlePage = (crimes)=>{
        $('.inline-crime-helper-elemet').each(function() {
             $(this).remove();
        })
        for(let i = 0; i < crimes.length; i++){
            const target = initial_targets[i];
            let crime_id;
            if(target){
                crime_id = target["ID"];
            }
            handleCrime($(crimes[i]), undefined, crime_id);
        }
    }

    const updatePage = ()=>{
        console.log("Crack helper starting.")
        if(location.href.endsWith("cracking")){
            inject_once();
            insertSelector();
            setCrackTitle("Loading");
            const crimes = $('.crime-option');
            if(crimes.length < 1){
                if(!updateInterval){
                    updateInterval = setInterval(()=>{
                        if($('.crime-option').length > 0 && cracker_helper.data.length > 0){
                            handlePage($('.crime-option'));
                            clearInterval(updateInterval);
                            updateInterval = undefined;
                        }
                    }, 1000);
                }
            } else{
                handlePage(crimes);
            }
        } else{
            $('.cracker-helper-panel').each(function(){
                $(this).remove();
            });
            $("div.cracker-helper-selector").remove();
        }
    }

    const handleCrackPerpare = (params, data)=>{
        const crimeValue = parseInt(params.get("value1"));
        if(!params.get("value2")){
            return
        }

        const char = params.get("value2").toLowerCase();
        const charPos = parseInt(params.get("value3"));

        const targets = data["DB"]["crimesByType"]["targets"];

        for(let i = 0; i < targets.length; i++){
            const target = targets[i];
            const target_id = target.ID;
            const target_panel = $(`.cracker-helper-panel:eq(${i})`)
            const target_index = parseInt(target_panel.attr('data-attr'));
            if(target_index < 10000){
                target_panel.attr('data-attr', target_id);
                target_panel.find("button.cracker-button-prev").attr("data-attr", target_id);
                target_panel.find("button.cracker-button-next").attr("data-attr", target_id);
                cracker_record[target_id] = cracker_record[target_index];
                delete cracker_record[target_index];
            }

            if(target_id === crimeValue){
                const currentChar = target["password"][charPos]["char"].toString();
                if(currentChar !== char){
                    if(!filter_history[target_id]){
                        filter_history[target_id] = [];
                    }
                    filter_history[target_id].push({
                        char,
                        charPos,
                    });
                    //handleCrime(target_panel.parent(), undefined, target_id)
                    setTimeout(() => {updatePage();}, 300);
                }
            }

        }
    }

    const handleCrackAttempt = (params, data)=>{
        try{
            const crimeID = parseInt(params.get("crimeID"));
            if(crimeID === 205){
                const crimeValue = parseInt(params.get("value1"));
                const targets = data["DB"]["crimesByType"]["targets"];
                console.log(`during attempt, crimeValue: ${crimeValue}`, params, data);

                let targetChars = '';

                for(let i = 0; i < targets.length; i++){
                    const target = targets[i];
                    const target_id = target.ID;
                    const target_panel = $(`.cracker-helper-panel:eq(${i})`)
                    const target_index = parseInt(target_panel.attr('data-attr'));
                    if(target_index < 10000){
                        target_panel.attr('data-attr', target_id);
                        target_panel.find("button.cracker-button-prev").attr("data-attr", target_id);
                        target_panel.find("button.cracker-button-next").attr("data-attr", target_id);
                        cracker_record[target_id] = cracker_record[target_index];
                        delete cracker_record[target_index];
                    }

                    if(target_id === crimeValue){
                        for(let j = 0; j < target.password.length; j++){
                            const char = target.password[j].char;
                            if(char === '*' || char === undefined){
                                targetChars += '.';
                            } else{
                                targetChars += char;
                            }
                        }
                        //handleCrime(target_panel.parent(), targetChars, target_id);
                        setTimeout(() => {updatePage();}, 300);
                    }
                }
            }
        }catch(err){
            console.log(err);
        }

    }

    let initial_targets = [];
    const handleCrackList = (data)=>{
        const targets = data["DB"]["crimesByType"]["targets"];
        if(initial_targets.length === 0){
            initial_targets = targets;
            if($(".cracker-helper-panel").length > 0){
                for(let i = 0; i < initial_targets.length; i++){
                    const target_id = initial_targets[i]["ID"];
                    const target_panel = $(`.cracker-helper-panel:eq(${i})`);
                    const target_index = parseInt(target_panel.attr('data-attr'));
                    target_panel.attr('data-attr', target_id);
                    target_panel.find("button.cracker-button-prev").attr("data-attr", target_id);
                    target_panel.find("button.cracker-button-next").attr("data-attr", target_id);
                    cracker_record[target_id] = cracker_record[target_index];
                    delete cracker_record[target_index];
                }
            }
        }
    }

    const interceptFetch = ()=>{
        const targetWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        const origFetch = targetWindow.fetch;
        targetWindow.fetch = async (...args) => {
            const rsp = await origFetch(...args);
            const url = new URL(args[0], location.origin);
            const params = new URLSearchParams(url.search);

            if (url.pathname === '/page.php' && params.get('sid') === 'crimesData') {
                const step = params.get("step");
                const clonedRsp = rsp.clone();
                if(step === "prepare"){
                    handleCrackPerpare(params, await clonedRsp.json());
                }
                else if(step === "attempt"){
                    handleCrackAttempt(params, await clonedRsp.json());
                }
                else if(step === "crimesList"){
                    handleCrackList(await clonedRsp.json());
                }
            }

            return rsp;
        };
    }

    const inject_once = ()=>{
        if(is_injected){
            return;
        }
        addStyle();
        interceptFetch();
        try{
            if(inPDA){
                console.log(`Load password list for PDA`);
                fetch_action(false);
            }
            else{
                GM.getValue(CRACKER_HELPER_KEY, cracker_helper).then((cracker)=>{
                    cracker_helper = cracker;

                    if(cracker_helper.source == PASSWORD_DATABASE[CRACKER_SEL]){
                        setCrackTitle("Loaded")
                        updatePage();

                        console.log('load cracker_helper from cache:')
                        console.log(cracker_helper)
                    }
                    else{
                        fetch_action();
                    }
                }).catch(()=>{
                    fetch_action(false)
                })
            }

        }
        catch(err){
            console.log(err)
        }
        is_injected = true;
    }

    console.log('Userscript cracker helper starts');
    updatePage();
    window.onhashchange = ()=>{
        updatePage();
    }

    const bindEventListener = function(type) {
        const historyEvent = history[type];
        return function() {
            const newEvent = historyEvent.apply(this, arguments);
           const e = new Event(type);
            e.arguments = arguments;
            window.dispatchEvent(e);
            return newEvent;
        };
    };
    history.pushState = bindEventListener('pushState');
    window.addEventListener('pushState', function(e) {
        updatePage();
    });

})();
