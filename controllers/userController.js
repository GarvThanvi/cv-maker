import puppeteer from "puppeteer";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const generatePDF = async (req, res) => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`${req.protocol}://${req.get("host")}` + "/resume1", {
      waitUntil: "networkidle2",
    });

    await page.setViewport({ width: 1680, height: 1050 });

    const todayDate = new Date();

    const pdfn = await page.pdf({
      path: `${path.join(
        __dirname,
        "../public/files",
        todayDate.getTime() + ".pdf"
      )}`,
      printBackground: true,
      format: "A4",
    });

    await browser.close();

    const pdfURL = path.join(
      __dirname,
      "../public/files",
      todayDate.getTime() + ".pdf"
    );

    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": pdfn.length,
    });

    res.sendFile(pdfURL);
  } catch (error) {
    console.log(error.message);
  }
};

export default generatePDF;
