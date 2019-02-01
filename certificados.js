var crypto = require("crypto");
var constants = require("constants"); 
var forge = require('node-forge');
var btoa = require('btoa');
var atob = require('atob');

exports.g_publickey_keyserver="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsrJQzVrHqis0bNl+6XZ6\nKpTAVvazlU8iJ9AtywOig+fl1xW+oZAdQQREZVNIxzFed7KxnwsDy/hIjkPCAokN\nUqqrZy77NnMldSZBk3eGCQ6VOtdALralr0N4SB8Q/U0Pu2bpa2ceMRwp/JAIQES+\nHwu5mc5ipxW1layNikfFH5g1ZlyokJlfzvFmUPTzk+GuzKy13BXNWRONBa3S5INp\nx6GG+AUy/7nPOq7OzeiHaoo6uuyGTHl2yImB7CLAY+wN2/db49a1X0ZFLBnOPbH+\nvSEDkDH3OehRWo6P7AB1EHrf6x4bUBRzxl1fbLpYJOBkt7tJZJmguW4DIPM+W8QK\nUQIDAQAB\n-----END PUBLIC KEY-----";
exports.g_privatekey_signing="";
exports.g_privatekey="";
exports.g_usuario="";
exports.g_passwordhash="";

var getRandomValues = require('get-random-values');

exports.random_string=function(l)
{
	var array = new Uint8Array(l);
	getRandomValues(array);
	var pass='';
	var saux="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (var i = 0; i < array.length; i++) {
		pass+=saux[array[i]%saux.length];
	}	
	return pass;
}



//var subtle= cripto.subtle || cripto.webkitSubtle ;

exports.quitar_cabeceras = function(key)
{
	var res;
	var p=key.indexOf("-----BEGIN PUBLIC KEY-----");
	if(p==0)
	{
		var lines = key.split('\n');
		lines.splice(0,1);
		lines.splice(lines.length-1,1);
		if(lines[lines.length-1][0]=='-')
			lines.splice(lines.length-1,1);
		var newtext = lines.join('\n');
		res=newtext;

		/*res=key.substr(27);
		if(res[0]=='\n')//!!ojo!! he añadido esto y puede hacer fallar de forma insesperada cosas
			res=res.substr(1);
		var l=res.length;
		res=res.substr(0,l-25);*/
	}
	else
	{
		//var p=key.indexOf("-----BEGIN RSA PRIVATE KEY-----");
		res=key.substr(29);
		var l=res.length;
		res=res.substr(0,l-29);
	}
	return res;
};

exports._arrayBufferToBase64=function( buffer ) {
	var binary = '';
	var bytes = new Uint8Array( buffer );
	var len = bytes.byteLength;
	/*if(len==127)
		console.log("_arrayBufferToBase64: "+len);*/
	for (var i = 0; i < len; i++) {
		binary += String.fromCharCode( bytes[ i ] );
	}
	return btoa( binary );
  }

  exports.base64StringToArrayBuffer=function(b64str) {
	var input = b64str.replace(/\s/g, '');
	var byteStr = atob(input);
	var bytes = new Uint8Array(byteStr.length);
	for (var i = 0; i < byteStr.length; i++) {
	  bytes[i] = byteStr.charCodeAt(i);
	}
	return bytes.buffer;
  }


  exports.str2ab=function(str) {
    var b = new ArrayBuffer(str.length);
    var view = new Uint8Array(b);
    for(var i = 0; i < str.length; ++i) {
      view[i] = str.charCodeAt(i);
    }
    return b;
  }

 
  exports.quitar_cabeceras=function(key)
  {
	  var res;
	  var p=key.indexOf("-----BEGIN PUBLIC KEY-----");
	  if(p==0)
	  {
		  var lines = key.split('\n');
		  lines.splice(0,1);
		  lines.splice(lines.length-1,1);
		  if(lines[lines.length-1][0]=='-')
			  lines.splice(lines.length-1,1);
		  var newtext = lines.join('\n');
		  res=newtext;
  
		  /*res=key.substr(27);
		  if(res[0]=='\n')//!!ojo!! he añadido esto y puede hacer fallar de forma insesperada cosas
			  res=res.substr(1);
		  var l=res.length;
		  res=res.substr(0,l-25);*/
	  }
	  else
	  {
		  //var p=key.indexOf("-----BEGIN RSA PRIVATE KEY-----");
		  res=key.substr(29);
		  var l=res.length;
		  res=res.substr(0,l-29);
	  }
	  return res;
  }
   
exports.encriptar_certificado=function(publickey_keyserver,certificado,f_done)
{
	//generar clave
    var key=this.random_string(32);
	var iv0=this.random_string(16);
	
	// our data to encrypt
	let data = certificado;
	//console.log('data=', data);

	// generate initialization vector
	let iv = new Buffer.from(iv0);
	//console.log('iv=', iv);

	// encrypt data
	let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
	let encryptedData = cipher.update(data, 'utf8', 'base64') + cipher.final('base64');
	//console.log('encrypted data='+ this._arrayBufferToBase64(this.str2ab(encryptedData)));
	
	var clave_encriptada = crypto.publicEncrypt({"key":new Buffer.from(publickey_keyserver),
		padding:constants.RSA_PKCS1_OAEP_PADDING}, new Buffer.from(key)).toString("base64");
		
	/*var md = forge.md.sha1.create();
	md.update(key, 'utf8');
	var clave_encriptada = pubKey.encrypt(md);*/
	/*let pubKey = forge.pki.publicKeyFromPem(publickey_keyserver);
	var clave_encriptada = pubKey.encrypt(key, 'RSA-OAEP', {
		md: forge.md.sha256.create(),
		mgf1: forge.md.sha256.create()
	  });*/

	//console.log('clave_encriptada('+key+')='+ this._arrayBufferToBase64(this.str2ab(clave_encriptada)));

	var certificado_encriptado=encryptedData+"#@@##"+clave_encriptada+"#@@##"+iv0;
	//console.log('certificado_encriptado= '+ certificado_encriptado);
	
	f_done(certificado_encriptado);	  					
}


exports.firmar_certificado=function(privkey,certificado_encriptado,f_done)
{	
	//firmar
	
	try
	{
	
		
	let privateKey = forge.pki.privateKeyFromPem(privkey);
	var md = forge.md.sha256.create();
	md.update(certificado_encriptado, 'utf8');
	var sig = this._arrayBufferToBase64(this.str2ab(privateKey.sign(md)));
	//var sig = Buffer.from(privateKey.sign(md)).toString('base64');
	}
	catch(e)
	{
		console.log(e);
	}
	//console.log("firma1: "+sig);
	
	/*var sign=crypto.createSign("RSA-SHA256");
	sign.update(certificado_encriptado);
	var sig=sign.sign(privkey,'utf-8');

	console.log("firma2: "+sig);*/
	f_done(sig);
	 
}

exports.desencriptar_rsa=function(privkey,data,f_done)
{
	var res = crypto.privateDecrypt({"key":new Buffer.from(privkey),
		padding:constants.RSA_PKCS1_OAEP_PADDING}, Buffer.from(data,'base64')).toString("utf-8");
	f_done(res);
}

exports.desencriptar_aes=function(key,data,iv,f_done)
{
	let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), Buffer.from(iv));
	let res = decipher.update(data, 'base64', 'utf-8') + decipher.final('utf-8');
	f_done(res);
}

exports.comprobar_firma_certificado=function(texto,firma,pubkey,f)
{
	try
	{
	//console.log("verifying texto: "+texto+" firma: "+ab2str(firma));
	subtle.verify(
		    {
				name: "RSASSA-PKCS1-v1_5",
				hash: { name: "SHA-256" }
		    },
		    pubkey, //from generateKey or importKey above
		    firma, //ArrayBuffer of the signature
		    this.str2ab(texto) //ArrayBuffer of the data
		)
		.then(function(isvalid){
		    //returns a boolean on whether the signature is true or not
			if(isvalid)
				f(1);
			else
				f(0);
		})
		.catch(function(err){
		    console.error(err);
		    f(-1);
		});
	}
	catch(e)
	{
		f(-2);
	}
}

