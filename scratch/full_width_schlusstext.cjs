const fs = require('fs');

function processFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');

  // Find the FUSSBEREICH section
  const startFuss = code.indexOf('{/* ===== FUSSBEREICH: KONDITIONEN, TEXTE & KALKULATION ===== */}');
  if (startFuss === -1) {
    console.log('Could not find FUSSBEREICH in ' + filePath);
    return;
  }

  // We look for the start of Schlusstext: {/* Schlusstext */}
  const schlusstextStart = code.indexOf('{/* Schlusstext */}', startFuss);
  if (schlusstextStart === -1) {
    console.log('Could not find {/* Schlusstext */} in ' + filePath);
    return;
  }

  // We look for the end of the Left Column which is before {/* Right Column: Kalkulation Summary Box */}
  const rightColumnStart = code.indexOf('{/* Right Column: Kalkulation Summary Box */}', schlusstextStart);
  if (rightColumnStart === -1) {
    console.log('Could not find {/* Right Column: Kalkulation Summary Box */} in ' + filePath);
    return;
  }

  // Find the exact </div> that closes the left column
  const leftColEnd = code.lastIndexOf('</div>', rightColumnStart);

  // Extract the Schlusstext and Anhänge part
  const schlussAndAnhaenge = code.substring(schlusstextStart, leftColEnd).trim();

  // Remove it from the original place
  code = code.substring(0, schlusstextStart) + code.substring(leftColEnd);

  // Find the action buttons
  let actionButtonsStart = code.indexOf('{/* Action Buttons for Duplicating / Archiving */}', startFuss);
  if (actionButtonsStart === -1) {
    // try the generic one for rechnungen
    actionButtonsStart = code.indexOf('{/* Action Buttons ', startFuss);
  }

  if (actionButtonsStart === -1) {
    console.log('Could not find action buttons in ' + filePath);
    return;
  }

  // To properly place it outside the grid, we need to place it after the grid closes.
  // The action buttons are outside the grid.
  // We can just insert it right before the action buttons.
  
  // Wait! Are the Action buttons inside the main container? Yes.
  // We insert it right before `{/* Action Buttons`
  
  const wrappedSchluss = '\n\n          {/* Full Width Schlusstext & Anhänge */}\n          <div className="space-y-6 pt-6">\n            ' + schlussAndAnhaenge + '\n          </div>\n\n          ';

  code = code.substring(0, actionButtonsStart) + wrappedSchluss + code.substring(actionButtonsStart);

  fs.writeFileSync(filePath, code);
  console.log('Processed ' + filePath);
}

processFile('src/views/OfferteDetailView.jsx');
processFile('src/views/RechnungDetailView.jsx');
