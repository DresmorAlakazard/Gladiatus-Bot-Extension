"use strict";

let isChromium = window.chrome;
let winNav = window.navigator;
let vendorName = winNav.vendor;
let isOpera = typeof window.opr !== "undefined";
let isIEedge = winNav.userAgent.indexOf("Edge") > -1;
let isIOSChrome = winNav.userAgent.match("CriOS");

let securehash;

let content;

let profile;

let server_id = window.location.href.match(/s(\d+)[\-\.](\w+)/i)[1];
let server_country = window.location.href.match(/s(\d+)[\-\.](\w+)/i)[2];