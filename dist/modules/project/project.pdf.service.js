"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.htmlToPdfBuffer = htmlToPdfBuffer;
const puppeteer_1 = __importDefault(require("puppeteer"));
async function htmlToPdfBuffer(html) {
    const browser = await puppeteer_1.default.launch({
        // si ça casse sur Linux serveur, on mettra args + executablePath
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
        });
        return Buffer.from(pdf);
    }
    finally {
        await browser.close();
    }
}
