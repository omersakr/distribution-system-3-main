const puppeteer = require('puppeteer');

class PDFServiceUltraFast {
    static browser = null;
    static initPromise = null;

    // Initialize a persistent browser instance
    static async initBrowser() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            if (this.browser && this.browser.isConnected()) {
                return this.browser;
            }

            console.log('Initializing PDF browser...');
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=TranslateUI',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--memory-pressure-off',
                    '--max_old_space_size=2048'
                ],
                timeout: 8000
            });

            // Handle browser disconnect
            this.browser.on('disconnected', () => {
                console.log('PDF Browser disconnected');
                this.browser = null;
                this.initPromise = null;
            });

            console.log('PDF browser initialized successfully');
            return this.browser;
        })();

        return this.initPromise;
    }

    static async generatePDF(html, options = {}) {
        const startTime = Date.now();
        let page;

        try {
            const browser = await this.initBrowser();
            page = await browser.newPage();

            // Optimize page settings for speed
            await page.setDefaultTimeout(8000);
            await page.setDefaultNavigationTimeout(8000);

            // Disable unnecessary resources
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const resourceType = req.resourceType();
                if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            // Set content with minimal wait
            await page.setContent(html, {
                waitUntil: 'domcontentloaded',
                timeout: 6000
            });

            // Minimal wait for rendering
            await page.waitForTimeout(200);

            // Generate PDF with optimized settings
            const pdfBuffer = await page.pdf({
                format: 'A4',
                margin: {
                    top: '15mm',
                    right: '10mm',
                    bottom: '15mm',
                    left: '10mm'
                },
                printBackground: true,
                preferCSSPageSize: false,
                displayHeaderFooter: false,
                timeout: 5000,
                ...options
            });

            const endTime = Date.now();
            console.log(`PDF generated in ${endTime - startTime}ms`);

            return pdfBuffer;
        } catch (error) {
            console.error('Ultra-fast PDF generation error:', error);
            throw new Error('فشل في إنشاء ملف PDF');
        } finally {
            if (page) {
                try {
                    await page.close();
                } catch (closeError) {
                    console.error('Error closing page:', closeError);
                }
            }
        }
    }

    // Lightweight HTML-to-PDF using html-pdf-node (fastest option)
    static async generatePDFLightweight(html, options = {}) {
        const htmlPdf = require('html-pdf-node');
        const startTime = Date.now();

        try {
            const pdfOptions = {
                format: 'A4',
                margin: {
                    top: '15mm',
                    right: '10mm',
                    bottom: '15mm',
                    left: '10mm'
                },
                printBackground: true,
                timeout: 5000,
                border: {
                    top: '0',
                    right: '0',
                    bottom: '0',
                    left: '0'
                },
                ...options
            };

            const file = { content: html };
            const pdfBuffer = await htmlPdf.generatePdf(file, pdfOptions);

            const endTime = Date.now();
            console.log(`Lightweight PDF generated in ${endTime - startTime}ms`);

            return pdfBuffer;
        } catch (error) {
            console.error('Lightweight PDF generation error:', error);
            // Fallback to ultra-fast method
            return this.generatePDF(html, options);
        }
    }

    // Smart PDF generation - chooses best method based on content size
    static async generatePDFSmart(html, options = {}) {
        const htmlSize = Buffer.byteLength(html, 'utf8');

        // For small HTML (< 50KB), use lightweight method
        if (htmlSize < 50000) {
            try {
                return await this.generatePDFLightweight(html, options);
            } catch (error) {
                console.log('Lightweight method failed, falling back to ultra-fast');
                return await this.generatePDF(html, options);
            }
        } else {
            // For larger HTML, use ultra-fast method
            return await this.generatePDF(html, options);
        }
    }

    static async cleanup() {
        if (this.browser) {
            try {
                await this.browser.close();
                console.log('PDF browser closed');
            } catch (error) {
                console.error('Error closing PDF browser:', error);
            }
            this.browser = null;
            this.initPromise = null;
        }
    }

    static getDownloadHeaders(filename) {
        const cleanFilename = filename.replace(/[<>:"/\\|?*]/g, '_');
        return {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(cleanFilename)}.pdf`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Content-Transfer-Encoding': 'binary'
        };
    }

    static formatFilename(type, entityName, fromDate, toDate) {
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 10);
        let filename = `${type}_${entityName}_${timestamp}`;
        if (fromDate && toDate) {
            filename += `_من_${fromDate}_إلى_${toDate}`;
        }
        return filename.replace(/[<>:"/\\|?*\s]/g, '_');
    }
}

// Cleanup on process exit
process.on('SIGINT', async () => {
    await PDFServiceUltraFast.cleanup();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await PDFServiceUltraFast.cleanup();
    process.exit(0);
});

module.exports = PDFServiceUltraFast;