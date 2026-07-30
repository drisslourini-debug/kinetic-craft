const fs = require('fs');
let code = fs.readFileSync('src/views/OfferteDetailView.jsx', 'utf8');

code = code.replace(
  `return (
    <div className={previewMode`,
  `try {
  return (
    <div className={previewMode`
);

code = code.replace(
  `    </div>
  )
}

export default OfferteDetailView`,
  `    </div>
  )
  } catch (err) {
    return (
      <div className="fixed inset-0 z-[200] bg-white p-10 overflow-y-auto">
        <h1 className="text-3xl text-red-600 font-bold mb-4">CRASH IN OFFERTE DETAIL VIEW</h1>
        <pre className="p-4 bg-gray-100 text-sm text-red-800 rounded mb-4 overflow-x-auto">{err.toString()}</pre>
        <pre className="p-4 bg-gray-100 text-xs text-gray-800 rounded overflow-x-auto">{err.stack}</pre>
      </div>
    )
  }
}

export default OfferteDetailView`
);

fs.writeFileSync('src/views/OfferteDetailView.jsx', code);
