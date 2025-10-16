const fs = require('fs');
const contexts = [];

const apiDir = './src/server/contexts';
const htmlOutDir = './api-docs';
const htmlOut = htmlOutDir + '/index.html';
const htmlStream = fs.createWriteStream(htmlOut);

const cssOut = htmlOutDir + '/index.css';
const cssStream = fs.createWriteStream(cssOut);

let body = ``;

// Create the api-docs directory if it doesn't exist
if(!fs.existsSync(htmlOutDir)) {
    fs.mkdirSync(htmlOutDir);
}

// fs.readdir(apiDir, (err, items) => {
//     const filtered = items.filter((item) => item !== 'services.json');
//
//     filtered.forEach(file => {
//         const ct = require(`${apiDir}/${file}`);
//         contexts.push(ct);
//     });
//
//     contexts.forEach((context, idx) => {
//         body = body + `<h1>${filtered[idx].substring(0, filtered[idx].length-5)}</h1><br />`;
//         console.log(body);
//         context.services.forEach(service =>{
//             console.log(service.name);
//         });
//     });
//
// });

const items = fs.readdirSync(apiDir);

const filtered = items.filter((item) => item !== 'services.json');

filtered.forEach(file => {
    const ct = require(`${apiDir}/${file}`);
    contexts.push(ct);
});

const styles = {
    method: {
        post: `background: #49cc90;`,
        get: `background: #61affe;`,
        put: `background: #fca130;`,
        delete: `background: #f93e3e;`,
        base: `background: #000; font-size: 14px; font-weight: 700; min-width: 80px; padding: 6px 15px; text-align: center; border-radius: 3px; text-shadow: 0 1px 0 rgba(0,0,0,.1); font-family: sans-serif; color: #fff;`
    },
    path: `font-size: 16px; display: flex; align-items: center; word-break: break-word; padding: 0 10px; font-family: monospace; font-weight: 600; color: #3b4151;`,
    header: {
        base: `display: flex; flex: 1;`,
        section: `display: flex; align-items: center; padding: 8px 20px; min-height: 50px; background: hsla(0,0%,100%,.8); box-shadow: 0 1px 2px rgba(0,0,0,.1);`,
        title: `font-size: 14px; flex: 1; margin: 0; font-family: sans-serif; color: #3b4151;`
    },

};

const method = styles.method;
const header = styles.header;
const table = styles.table;

contexts.forEach((context, idx) => {
    body = body + `<h1>${filtered[idx].substring(0, filtered[idx].length-5)}</h1>\n`;
    context.services.forEach(service =>{
        service.types.forEach(serviceType => {
            body = body + `
           <div class="block block-${serviceType}">
           <div class="summary summary-${serviceType}">
                <span class="method method-${serviceType}">${serviceType.toUpperCase()}</span> 
                <span class="path">${service.path}</span>
                <div class="summary-description">${service.summary || ''}</div>
           </div>
           <!-- Description -->
           ${service.description ? `<div class="description-wrapper">
                <p>${service.description}</p>
           </div>` : ''}
           <!-- Details Header -->
           <div style="height: auto; border: none; margin: 0px; padding: 0px;">
               <div>
                    <div class="header-section">
                        <div class="header-main">
                            <h4 class="header-title">
                                Details
                            </h4>                              
                        </div>                    
                    </div>
                </div>
           </div>
          <!-- Details Body -->
          <div class="details">
            <table>
                <thead>
                     <tr>
                        <th>Flag</th>
                        <th class="table-description">Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="font-weight: 700; margin-bottom: 1em;">Service</td>
                        <td style="font-weight: 700; margin-bottom: 1em;">${service.name}</td>
                    </tr>
                    ${service.enabled !== undefined ? `<tr>
                                <td>Enabled</td>
                                <td>${service.enabled}</td>
                            </tr>` : ''}                
                    ${service.protectedRoute !== undefined ? `<tr>
                        <td>Protected Route</td>
                        <td>${service.protectedRoute}</td>
                    </tr>` : ''}
                    ${service.appendAccount !== undefined ? `<tr>
                        <td>Append Account</td>
                        <td>${service.appendAccount}</td>
                    </tr>` : ''}
                    ${service.appendJWT !== undefined ? `<tr>
                        <td>Append JWT</td>
                        <td>${service.appendJWT}</td>
                    </tr>` : ''}
                </tbody>
            </table>
          </div>
           <!-- Response Header -->           
           <!-- Parameters Header -->
           <div style="height: auto; border: none; margin: 0px; padding: 0px;">
               <div>
                    <div class="header-section">
                        <div class="header-main">
                            <h4 class="header-title">
                                Parameters
                            </h4>                              
                        </div>                    
                    </div>
                </div>
           </div>
          <!-- Parameters Body -->
          <div class="details">
            <table>
                <thead>
                     <tr>
                        <th>Name</th>
                        <th class="table-description">Description</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td></td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
          </div>
           <!-- Response Header -->
           <div style="height: auto; border: none; margin: 0px; padding: 0px;">
               <div>
                    <div class="header-section">
                        <div class="header-main">
                            <h4 class="header-title">
                                Responses
                            </h4>                              
                        </div>                    
                    </div>
                </div>
           </div>
          <!-- Response Body -->
          <div class="details">
            <table>
                <thead>
                     <tr>
                        <th>Code</th>
                        <th class="table-description">Description</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td></td>
                        <td>
                        <div class="highlight-code">
                        <pre class="microlight">
${JSON.stringify(service.response, null, 2)}
                        </pre>
                        </div>
                        </td>
                    </tr>
                </tbody>
            </table>
          </div>
          </div>
        `;
        });
    });
});

const buildHtml = () => {
    return `<!DOCTYPE html>
<html>
    <head>
        <title>API Docs</title>
        <link rel="stylesheet" type="text/css" href="./index.css">
    </head>
    <body>
    <div style="width: 100%;max-width: 1460px;margin: 0 auto;padding: 0 20px;box-sizing: border-box;">
        ${body}
    </div>
    </body>
</html>
`
};

htmlStream.once('open', (fd) => {
    const html = buildHtml();

    htmlStream.end(html);
});

cssStream.once('open', (fd) => {
    const css = `
        .block {
            margin: 0 0 15px; 
            border: 1px solid #000; 
            border-radius: 4px; 
            box-shadow: 0 0 3px rgba(0,0,0,.19);
        }
        
        .block-get {
            border-color: #61affe;
            background: rgba(97,175,254,.1);
        }
        
        .block-put {
            border-color: #fca130;
            background: rgba(252,161,48,.1);
        }
        
        .block-post {
            border-color: #49cc90; 
            background: rgba(73,204,144,.1);
        }
        
        .block-delete {
            border-color: #f93e3e;
            background: rgba(249,62,62,.1);
        }
        
        .summary {
            display: flex; 
            align-items: center; 
            padding: 5px; 
            cursor: pointer;
            border-bottom: 1px solid #000;
        }
        
        .summary-get {
            border-color: #61affe;
        }
        
        .summary-put {
            border-color: #fca130;
        }
        
        .summary-post {
            border-color: #49cc90;
        }
        
        .summary-delete {
            border-color: #f93e3e;
        }
        
        .summary-description {
            font-size: 13px; 
            flex: 1 1 auto; 
            word-break: break-word; 
            font-family: sans-serif; 
            color: #3b4151;
         }
         .details {
         padding: 20px
         }   
        .details table {
            width: 100%;
            padding: 0 10px;
            border-collapse: collapse;
            }
        .details thead {
            display: table-header-group;
            vertical-align: middle;
            border-color: inherit;
        }
        .details table thead tr th {
            font-size: 12px;
            font-weight: 700;
            padding: 12px 0;
            text-align: left;
            border-bottom: 1px solid rgba(59,65,81,.2);
            font-family: sans-serif;
            color: #3b4151;
        }
        .details tbody {
            display: table-row-group;
            vertical-align: middle;
            border-color: inherit;
        }
        .table-description {
            width: 90%;
            margin-bottom: 2em;
        }
        .details td {
            font-size: 14px;
            font-family: sans-serif;
            color: #3b4151;
            margin-bottom: 1em;
        }
        
        .method {
            background: #000; 
            font-size: 14px; 
            font-weight: 700; 
            min-width: 80px; 
            padding: 6px 15px; 
            text-align: center; 
            border-radius: 3px; 
            text-shadow: 0 1px 0 rgba(0,0,0,.1); 
            font-family: sans-serif; 
            color: #fff;
        }
        
        .method-get {
            background: #61affe;
        }
        
        .method-put {
            background: #fca130;;
        }
        
        .method-post {
            background: #49cc90;
        }
        
        .method-delete {
            background: #f93e3e;;
        }
        
        .path {
            font-size: 16px; 
            display: flex; 
            align-items: center; 
            word-break: break-word; 
            padding: 0 10px; 
            font-family: monospace; 
            font-weight: 600; 
            color: #3b4151;
        }
        
        .header-main {
            display: flex; 
            flex: 1;
        }
        
        .header-section {
            display: flex; 
            align-items: center; 
            padding: 8px 20px; 
            min-height: 50px; 
            background: hsla(0,0%,100%,.8); 
            box-shadow: 0 1px 2px rgba(0,0,0,.1);
        }
        
        .header-title {
            font-size: 14px; 
            flex: 1; 
            margin: 0; 
            font-family: sans-serif; 
            color: #3b4151;
        }
        
        .description-wrapper {
            font-size: 12px;
            margin: 0 0 5px;
            padding: 15px 20px;
            font-family: sans-serif;
            color: #3b4151;
        }
        
        .description-wrapper p {
            font-size: 14px;
            margin: 1em auto;
            font-family: sans-serif;
            color: #3b4151;
        }
            
        .microlight {
            font-size: 12px;
            margin: 0;
            padding: 10px;
            white-space: pre-wrap;
            word-wrap: break-word;
            word-break: break-all;
            word-break: break-word;
            -webkit-hyphens: auto;
            -ms-hyphens: auto;
            hyphens: auto;
            border-radius: 4px;
            background: #41444e;
            overflow-wrap: break-word;
            font-family: monospace;
            font-weight: 600;
            color: #fff;       

            overflow-y: auto;
            max-height: 400px;
            min-height: 6em;                 
        }
        
        .highlight-code {
            position: relative;
            margin-top: 1em;
        }
    `;


    cssStream.end(css);
});

