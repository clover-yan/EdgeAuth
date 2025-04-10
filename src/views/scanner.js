export default function renderScannerPage() {
	return `
	<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QR Scanner - EdgeAuth</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gray-100 flex flex-col">
    <header class="bg-white border-b">
        <div class="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 class="text-2xl font-bold text-gray-800">EdgeAuth</h1>
            <a href="/" class="text-blue-500 hover:text-blue-600 font-medium">Cancel</a>
        </div>
    </header>

    <main class="flex-grow flex flex-col items-center justify-center px-4 py-8">
        <div class="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
            <h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">Scan QR Code</h2>
            <div class="bg-gray-200 aspect-square w-full max-w-xs mx-auto mb-6 flex flex-col items-center justify-center" id="reader">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </div>
            <p class="text-center text-gray-600 mb-4">
                Position the QR code within the frame to scan
            </p>

			<div id="result"></div>
			<div class="mb-4">
                <label id="manual-input-label" for="manual-code" class="block text-sm font-medium text-gray-700 mb-1">Or enter code
                    manually:</label>
                <input type="text" id="manual-code" name="manual-code"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter code here">
                <input type="text" id="manual-issuer" name="manual-issuer"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter issuer here">
            </div>
            <div class="text-center">
                <button
                    id="add-token-btn"
                    class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    onclick="manualAdd()">
                    Add Token
                </button>
            </div>
        </div>
    </main>

   <script src="https://unpkg.com/html5-qrcode" type="text/javascript"></script>

   <script>

		let keyURIObjGlobal;

		const OTPURI_REGEX =
            /^otpauth:\\/\\/([ht]otp)\\/(.+)\\?([A-Z0-9.~_-]+=[^?&]*(?:&[A-Z0-9.~_-]+=[^?&]*)*)$/i;


        const INTEGER_REGEX = /^[+-]?\d+$/;

        const SECRET_REGEX = /^[2-7A-Z]+=*$/i;

        const ALGORITHM_REGEX = /^SHA(?:1|224|256|384|512|3-224|3-256|3-384|3-512)$/i;

        const POSITIVE_INTEGER_REGEX =  /^\\+?[1-9]\\d*$/;


        // custom keyURI parser
        function parse(uri) {
            // create uriGroups array
            let uriGroups;

            try {
                uriGroups = uri.match(OTPURI_REGEX);
            } catch (_) {
                // handled below
            }
            if (!Array.isArray(uriGroups)) {
                throw new URIError("Invalid URI format");
            }

            // get the uri parameters
            const uriType = uriGroups[1].toLowerCase();
            const uriLabel = uriGroups[2]
                .split(/(?::|%3A) *(.+)/i, 2)
                .map(decodeURIComponent);

            const uriParams = uriGroups[3].split("&").reduce((acc, cur) => {
                const pairArr = cur.split(/=(.*)/, 2).map(decodeURIComponent);
                const pairKey = pairArr[0].toLowerCase();
                const pairVal = pairArr[1];
                const pairAcc = acc;
                pairAcc[pairKey] = pairVal;
                return pairAcc;
            }, {});

            let OTP;
            const config = {};

            if (uriType == "totp") {
                OTP = "TOTP";
                // Period: optional
                if (typeof uriParams.period !== "undefined") {
                    if (POSITIVE_INTEGER_REGEX.test(uriParams.period)) {
                        config.period = parseInt(uriParams.period, 10);
                    } else {
                        throw new TypeError("Invalid 'period' parameter");
                    }
                }
            } else {
                throw new Error("Unknown OTP type");
            }

            // Label: required
            // Issuer: optional
            if (typeof uriParams.issuer !== "undefined") {
                config.issuer = uriParams.issuer;
            }
            if (uriLabel.length === 2) {
                config.label = uriLabel[1];
                if (typeof config.issuer === "undefined" || config.issuer === "") {
                    config.issuer = uriLabel[0];
                } else if (uriLabel[0] === "") {
                    config.issuerInLabel = false;
                }
            } else {
                config.label = uriLabel[0];
                if (typeof config.issuer !== "undefined" && config.issuer !== "") {
                    config.issuerInLabel = false;
                }
            }
            // Secret: required
            if (
                typeof uriParams.secret !== "undefined" &&
                SECRET_REGEX.test(uriParams.secret)
            ) {
                config.secret = uriParams.secret;
            } else {
                throw new TypeError("Missing or invalid 'secret' parameter");
            }
            // Algorithm: optional
            if (typeof uriParams.algorithm !== "undefined") {
                if (ALGORITHM_REGEX.test(uriParams.algorithm)) {
                    config.algorithm = uriParams.algorithm;
                } else {
                    throw new TypeError("Invalid 'algorithm' parameter");
                }
            }
            // Digits: optional
            if (typeof uriParams.digits !== "undefined") {
                if (POSITIVE_INTEGER_REGEX.test(uriParams.digits)) {
                    config.digits = parseInt(uriParams.digits, 10);
                } else {
                    throw new TypeError("Invalid 'digits' parameter");
                }
            }

            // handle all default fields if left unpopulated by above functions
            // default algorithm: SHA1
            if (!config.algorithm) {
                config.algorithm = "SHA1";
            }
            // default digits: 6
            if (!config.digits) {
                config.digits = 6;
            }
            // default period: 30
            if (!config.period) {
                config.period = 30;
            }
            return config;
        }

		async function addToken(keyURIObj) {
            const resp = await fetch("/api/token/new", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(keyURIObj)
            });

            if (resp.ok) {
                const respJson = await resp.json();
				return respJson;
            } else {
                alert("Failed to add token");
            }
        }

		async function saveToken(keyURIObj) {

			// disable the save token button
			document.getElementById('save-token-btn').disabled = true;

			const resp = await fetch("/api/token/save", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(keyURIObj)
			});

			if (resp.ok) {
				const respJson = await resp.json();
				// redirect to the homepage
				window.location.href = "/";
				return respJson;
			}
			else {
				alert("Failed to save token");
				// enable the save token button
				document.getElementById('save-token-btn').disabled = false;
			}
		}

		const scanner = new Html5QrcodeScanner('reader', {
            // Scanner will be initialized in DOM inside element with id of 'reader'
            qrbox: {
                width: 250,
                height: 250,
            },  // Sets dimensions of scanning box (set relative to reader element width)
            fps: 20, // Frames per second to attempt a scan
        });


        scanner.render(success, error);
        // Starts scanner

        async function success(result) {

			// clear the scanner instance and remove the scanner element
			scanner.clear();
			document.getElementById('reader').remove();

			// call the api to add the token
			const keyURIObj = parse(result);
			const resp = await addToken(keyURIObj);
			// set the keyURIObj to the global scope
			keyURIObjGlobal = keyURIObj;

            // disable manual code input
            document.getElementById('manual-code').remove();
            document.getElementById('manual-issuer').remove();
            document.getElementById('manual-input-label').remove();
            document.getElementById('add-token-btn').remove();

            document.getElementById('result').innerHTML = \`
			<div class="mt-8 p-4 border border-gray-300 rounded-md bg-gray-50">
				<h3 class="text-lg font-semibold text-gray-800 mb-2">Scanned Result</h3>
				<div class="mb-4">
					<p class="text-sm text-gray-600">Issuer:</p>
					<p class="font-medium">\${keyURIObj.issuer}</p>
				</div>
				<div class="mb-4">
					<p class="text-sm text-gray-600">Current TOTP:</p>
					<p class="text-2xl font-bold text-blue-600">\${resp.code}</p>
				</div>
				<button
				id="save-token-btn"
					class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-gray-500" onclick="saveToken(keyURIObjGlobal)">
					Save Token
				</button>
			</div>\`;
            // Prints result as a link inside result element

        }

        function error(err) {
            console.error(err);
            // Prints any errors to the console
        }

        function manualAdd() {
            const manualCode = document.getElementById('manual-code').value;
            const manualIssuer = document.getElementById('manual-issuer').value;
            success(\`otpauth://totp/manual?secret=\${encodeURIComponent(manualCode)}&issuer=\${encodeURIComponent(manualIssuer)}\`);
        }

    </script>

   		<footer class="bg-white border-t py-4">
    		<div class="container mx-auto px-4 text-center text-sm text-gray-600">
            EdgeAuth from <a href="https://github.com/alanJames00" class="text-blue-500 hover:underline" target="_blank">alanjames</a>
        	</div>
     	</footer>

</body>
</html>
	`;
}
