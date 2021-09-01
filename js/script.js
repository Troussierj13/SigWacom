var paramModule = {
    "docName": "Signature du document : VisiteMedicaleAptitude.pdf",
    "fname": "Julien",
    "lname": "Troussier"
};

var sigText = null;
var base64Sig = null;
var bytePdfBase = null;

function _base64ToArrayBuffer(base64) {
    var binary_string = window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

async function DownloadModifiedPDF(jsonResult) {

    const pdfDocBase = await PDFLib.PDFDocument.load(jsonResult.pdfBaseByte)

    const pages = pdfDocBase.getPages()
    const firstPage = pages[0]
    /*const form = pdfDocBase.getForm();
    const fields = form.getFields()
    fields.forEach(field => {
        const name = field.getName()
        console.log('Field name:', name)
    })*/

    //const field = form.getField('Signature 1');
    //console.log(field);

    const pngImage = await pdfDocBase.embedPng(jsonResult.base64Sig);
    const pngDims = pngImage.scale(0.35)
    firstPage.drawImage(pngImage, {
        x: 380,
        y: 95,
        width: pngDims.width,
        height: pngDims.height,
    })

    //field.setImage(pngImage);
    //const jpgDims = jpgImage.scale(1);

    /*firstPage.drawImage(jpgImage, {
        x: 25,
        y: 25,
        width: jpgDims.width,
        height: jpgDims.height
    })*/

    // Serialize the PDFDocument to bytes (a Uint8Array)
    const pdfBytes = await pdfDocBase.save()

    var filename = jsonResult.filename;
    var blob = new Blob([pdfBytes], {type: 'application/pdf'});
    var link = document.createElement("a");
    link.download = filename;
    link.innerHTML = "Download File";
    link.href = window.URL.createObjectURL(blob);
    link.click();
    link.remove();
}

function OnChangeFile(event) {
    var file = event.target.files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
        bytePdfBase = e.target.result;
        //console.log(bytePdfBase);
        capture();
    };

    reader.readAsArrayBuffer(file);
}

function ReturnValue() {
    let jsonResult = {"base64Sig": base64Sig, "sigText": sigText, "pdfBaseByte":bytePdfBase, "filename": "VisiteMedicaleAptitude.pdf"};
    console.log(base64Sig);

    DownloadModifiedPDF(jsonResult);
}

/*  This is the main function for capturing the signature from the pad */
function capture()
{
    var files = document.getElementById('files').files;
    if (!files.length) {
        alert('Please select a file!');
        return;
    }
    var file = files[0];

    //console.log(file);

    if(!wgssSignatureSDK.running || null == dynCapt)
    {
        //print("Session error. Restarting the session.");
        actionWhenRestarted(window.Capture);   // See SigCaptX-SessionControl.js
        return;
    }

    // Construct a hash object to contain the hash
    var hash = new wgssSignatureSDK.Hash(onHashConstructor);

    function onHashConstructor(hashV, status)
    {
        if(wgssSignatureSDK.ResponseStatus.OK == status)
        {
            GetHash(hash, onGetInitialHash);
        }
        else
        {
            //print("Hash Constructor error: " + status);
            if(wgssSignatureSDK.ResponseStatus.INVALID_SESSION == status)
            {
                //print("Error: invalid session. Restarting the session.");
                actionWhenRestarted(window.Capture);
            }
        }
    }

    // If the hash value has been calculated successfully next steps is to capture the signature
    function onGetInitialHash()
    {
        var firstName = paramModule.fname;
        var lastName = paramModule.lname;
        var fullName = firstName + " " + lastName;
        var title = paramModule.docName;

        dynCapt.Capture(sigCtl, fullName, title, hash, null, onDynCaptCapture);
    }

    function onDynCaptCapture(dynCaptV, SigObjV, status)
    {
        if(wgssSignatureSDK.ResponseStatus.INVALID_SESSION == status)
        {
            print("Error: invalid session. Restarting the session.");
            actionWhenRestarted(window.Capture);  // See SigCaptX-SessionControl.js
        }
        else
        {
            /* Check the status returned from the signature capture */
            switch( status )
            {
                case wgssSignatureSDK.DynamicCaptureResult.DynCaptOK:
                    sigObj = SigObjV;
                    print("Signature captured successfully");

                    /* Set the RenderBitmap flags as appropriate depending on whether the user wants to use a picture image or B64 text value */
                    var outputFlags = wgssSignatureSDK.RBFlags.RenderOutputBase64 | wgssSignatureSDK.RBFlags.RenderColor32BPP;
                    sigObj.RenderBitmap('png', imageBox.clientWidth, imageBox.clientHeight, BITMAP_INKWIDTH, BITMAP_INKCOLOR, BITMAP_BACKGROUNDCOLOR, outputFlags, BITMAP_PADDING_X, BITMAP_PADDING_Y, onRenderBitmap);
                    break;

                case wgssSignatureSDK.DynamicCaptureResult.DynCaptCancel:
                    print("Signature capture cancelled");
                    break;

                case wgssSignatureSDK.DynamicCaptureResult.DynCaptPadError:
                    print("No capture service available");
                    break;

                case wgssSignatureSDK.DynamicCaptureResult.DynCaptError:
                    print("Tablet Error");
                    break;

                case wgssSignatureSDK.DynamicCaptureResult.DynCaptNotLicensed:
                    print("No valid Signature Capture licence found");
                    break;

                default:
                    print("Capture Error " + status);
                    break;
            }
        }
    }

    function onRenderBitmap(sigObjV, bmpObj, status)
    {
        if(wgssSignatureSDK.ResponseStatus.OK == status)
        {
            var imageBox = document.getElementById("imageBox");

            print("base64_image:>"+bmpObj+"<");
            img = new Image();
            img.src = "data:image/png;base64," + bmpObj;

            if(null == imageBox.firstChild)
            {
                imageBox.appendChild(img);
            }
            else
            {
                imageBox.replaceChild(img, imageBox.firstChild);
            }

            base64Sig = bmpObj;
            console.log("png ? : " + bmpObj);
            console.log(sigObjV);
            sigObjV.GetSigText(onGetSigText);
        }
        else
        {
            print("Signature Render Bitmap error: " + status);
        }
    }

    /* This function takes the SigText value returned by the callback and places it in the txtSignature tag on the form */
    function onGetSigText(sigObjV, text, status)
    {
        if(wgssSignatureSDK.ResponseStatus.OK == status)
        {
            sigText = text;
            ReturnValue();
        }
        else
        {
            print("Signature Render Bitmap error: " + status);
        }
    }
}

// This function calculates a hash value using the first and last names on the HTML form
function GetHash(hash, callback)
{
    print("Creating hash:");
    hash.Clear(onClear);

    function onClear(hashV, status)
    {
        if(wgssSignatureSDK.ResponseStatus.OK == status)
        {
            hash.PutType(wgssSignatureSDK.HashType.HashMD5, onPutType);
        }
        else
        {
            print("Hash Clear error: " + status);
        }
    }

    function onPutType(hashV, status)
    {
        if(wgssSignatureSDK.ResponseStatus.OK == status)
        {
            var vFname = new wgssSignatureSDK.Variant();
            vFname.Set(paramModule.fname);
            hash.Add(vFname, onAddFname);
        }
        else
        {
            print("Hash PutType error: " + status);
        }
    }

    function onAddFname(hashV, status)
    {
        if(wgssSignatureSDK.ResponseStatus.OK == status)
        {
            var vLname = new wgssSignatureSDK.Variant();
            vLname.Set(paramModule.lname);
            hash.Add(vLname, onAddLname);
        }
        else
        {
            print("Hash Add error: " + status);
        }
    }

    function onAddLname(hashV, status)
    {
        if(wgssSignatureSDK.ResponseStatus.OK == status)
        {
            callback();
        }
        else
        {
            print("Hash Add error: " + status);
        }
    }
}