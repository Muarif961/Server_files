const pdfLib = require('pdf-lib');
const fs = require('fs');

const thatchamPDFPath = __dirname + '/../pdf-templates/intelizzz-thatcham-certificate-template.pdf';

// const tempArray = [
//     'Anthony Williams',
//     'Mercedes Benz',
//     'Vito Tourer',
//     'YF70 1UL',
//     '12345-12345',
//     'Intelizzz',
//     '5th November 2020'
// ];
const zeropad = (number, size) => {
    return (Array(size).join('0') + number).substr(-size);
};

const generateThatchamPDF = async (data, certificateNumber) => {
    const existingPdfBytes = await fs.readFileSync(thatchamPDFPath);
    const pdfDoc = await pdfLib.PDFDocument.load(existingPdfBytes);

    // Embed the Helvetica font
    const helveticaFont = await pdfDoc.embedFont(pdfLib.StandardFonts.HelveticaBold);

    // Get the first page of the document
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // Get the width and height of the first page
    const {width, height} = firstPage.getSize();

    firstPage.drawText(zeropad(certificateNumber, 7), {
        x: width - 96,
        y: height - 42,
        size: 18,
        // font: helveticaFont,
        color: pdfLib.rgb(0.3, 0.3, 0.3),
    });

    let startY = 587;

    data.forEach(item => {
        firstPage.drawText(item, {
            x: 350,
            y: startY,
            size: 11,
            font: helveticaFont,
            color: pdfLib.rgb(0.3, 0.3, 0.3),
        });

        startY = startY - 34;
    });

    // Write the PDF to a file
    // fs.writeFileSync('./test2.pdf', await pdfDoc.save());
    return await pdfDoc.save();
};

module.exports = { generateThatchamPDF }

// generateThatchamPDF(tempArray);
