const puppeteer = require('puppeteer');

const generatePDFBuffer = async (htmlContent) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true
  });

  await browser.close();
  return pdfBuffer;
};

module.exports = generatePDFBuffer;











// const puppeteer = require('puppeteer');

// const generatePDFBuffer = async (htmlContent) => {
//   const browser = await puppeteer.launch({ headless: "new" });
//   const page = await browser.newPage();
//   await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

//   const pdfBuffer = await page.pdf({
//     format: 'A4',
//     printBackground: true
//   });

//   await browser.close();
//   return pdfBuffer;
// };

// module.exports = generatePDFBuffer;
