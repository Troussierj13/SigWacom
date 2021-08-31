var paramModule = {
    "docName": "Signature du document : docTest.pdf",
    "fname": "Julien",
    "lname": "Troussier"
};

var sigText = null;
var base64Sig = null;

/*var deferreds = [];

let pSigText = new Promise(function(resolve, reject){
    deferreds.push({resolve: resolve, reject: reject});
    let pBase64Sig = new Promise(function(resolve, reject){
        deferreds.push({resolve: resolve, reject: reject});
    });
});*/

function ReturnValue() {
    let jsonResult = {"base64": base64Sig, "sigText": sigText};
    console.log(jsonResult);

}

/*  This is the main function for capturing the signature from the pad */
function capture()
{
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
                    sigObj.RenderBitmap(BITMAP_IMAGEFORMAT, imageBox.clientWidth, imageBox.clientHeight, BITMAP_INKWIDTH, BITMAP_INKCOLOR, BITMAP_BACKGROUNDCOLOR, outputFlags, BITMAP_PADDING_X, BITMAP_PADDING_Y, onRenderBitmap);
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