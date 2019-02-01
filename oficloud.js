var https=require("https");
var FormData = require('form-data');
var querystring = require("querystring");
var argon2 = require("argon2");
var sha1 = require("sha1");
var aesjs = require('aes-js');
var forge = require('node-forge');

var secrets = require('secrets.js');

var certificados=require("./certificados");

exports.api_path="/clientdev/restapi";

exports.init=function(pubkey_keyserrver)
{
    certificados.g_publickey_keyserver=pubkey_keyserrver;
}

exports.login=function(usuario,password,ondone)
{
	var passwordhash=sha1(password);
	var post_data = querystring.stringify({
				'op' : 'login',
				'user' : usuario,
				'password' : passwordhash
		});

	certificados.g_usuario=usuario;
	certificados.g_passwordhash=passwordhash;

	//console.log(post_data);

	// An object of options to indicate where to post to
	var post_options = {
		host: 'www.oficloud.com',
		port: '443',
		path: this.api_path,
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(post_data)
		}
	};

	// Set up the request
	var post_req = https.request(post_options, function(res) {
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			//console.log('Response: ' + chunk);
			var arr = JSON.parse(chunk);
			if(arr.res=="ok")
			{    
				login2(arr,password,arr.salt,arr.iterations,ondone);
			}
			else{
				ondone(arr);
			}
		});
		res.on("error", function (err) {
			ondone(err);
		});
	});

	// post the data
	post_req.write(post_data);
	post_req.end();

}

function login2(res,password,salt,iterations,ondone)
{
	salt=Buffer.from(salt);

	argon2.hash(password,{raw:false,type: argon2.argon2d,salt:salt,timeCost: iterations, memoryCost: 1024, hashLen: 32})
	.then(hash => {
		var a=hash.split("$");
		
		certificados.g_publickey_keyserver=res.pubkey_keysharing;
		
		certificados.g_privatekey=decryptAES2(Buffer.from(res.encrypted_privkey,"base64"),Buffer.from(a[5],"base64"),Buffer.from(res.iv));		
		certificados.g_privatekey_signing=decryptAES2(Buffer.from(res.encrypted_privkey_signing,"base64"),Buffer.from(a[5],"base64"),Buffer.from(res.iv));
		
		//console.log("certificados.g_privatekey "+certificados.g_privatekey);
		//console.log("certificados.g_privatekey_signing "+certificados.g_privatekey_signing);

		ondone(res);

	}).catch(err => {
		// ...
		console.log("err:" +err)
	});
}

var my_channels=[];

exports.open_channel=function(channelid,onmsg,ondone)
{
	let esto=this;
	
    get_channel_data(this.api_path,channelid,function(json){
		if(json.e!="0")
		{
			ondone(json.desc);
			return;
		}
		var sh1=json.share;
		var sh2=json.share2;
		let lc=-1;
		
		//console.log("get_channel_data: " + JSON.stringify(json));

		//console.log("share1: " + sh1);
		//console.log("share2: " + sh2);
		
		certificados.desencriptar_rsa(certificados.g_privatekey,sh2,function(dec){
			//console.log("share2: " + dec);
			var aeskey=secrets.hex2str(secrets.combine([sh1,dec]));
            //console.log("aeskey: " + aeskey);
            
            my_channels[channelid]={aeskey: aeskey};

			function tick()
			{
				list_channel(esto.api_path,channelid,-1,lc,-1,function(res){
					lc=res.last_change;
					for(var i = 0; i < res.list.length; i++)
					{
						var msg=res.list[i].blob;
						var iv=res.list[i].iv;
						msg=decryptAES2(Buffer.from(msg,"base64"),Buffer.from(aeskey,"utf-8"),Buffer.from(iv,"utf-8"));		
                        
                        onmsg(msg);
						/*msg=certificados.desencriptar_aes(aeskey,msg,iv,function(decmsg){
							console.log("decmsg: " + decmsg);
						})*/
					}
					setTimeout(tick,5000);
				})
	
			}

            tick();
            ondone();

		})

	});
}

exports.list_channels= function(ondone)
{
	try{

		var form = new FormData();

		form.append("op","listchannels");		
		form.append("user",certificados.g_usuario);
		form.append("password",certificados.g_passwordhash);
		
		
		form.submit('https://www.oficloud.com'+this.api_path,function(err,res){
			if(!err)
			{
				res.on('data', (chunk) => {
					//console.log(`Received ${chunk.length} bytes of data.`);
					//console.log("Respuesta2: " + chunk);
					var json=JSON.parse(chunk);
					ondone(json);
					
					});
			}
		});
	}
	catch(e)
	{
		console.log(e);
	}
}


exports.send_post=function (channel,message,ondone)
{
	if(typeof my_channels[channel]==="undefined")
	{
		ondone({e:-1,desc:"Channel not open"});
		return;
	}

	var aeskey=my_channels[channel].aeskey;
	

	var iv=certificados.random_string(16);

	var form = new FormData();

	form.append("op","addchannelmessage");
	form.append("channel",channel);
	form.append("reply_to",-1);
	form.append("iv",iv);
	form.append("user",certificados.g_usuario);
	form.append("password",certificados.g_passwordhash);

	var encmsg=encryptAES2(message,aeskey,iv);	
	//console.log("eh "+encmsg);

	var file=encmsg.toString("base64");
	//console.log("eh "+file);
	form.append('message', file,{
		filename: 'message.zip',
		contentType: 'application/zip'
	});
	

	form.submit('https://www.oficloud.com'+this.api_path,function(err,res){
			if(!err)
			{
				res.on('data', (chunk) => {
					//console.log(`Received ${chunk.length} bytes of data.`);
					//console.log("Respuesta4: " + chunk);
					var json=JSON.parse(chunk);
					ondone(json);
					
					});
			}
		});

}


function encryptAES2(bytes,key,iv) { 	
	
	
	var cipher = forge.cipher.createCipher('AES-CBC', key);
	
	cipher.start({iv: iv});
	cipher.update(forge.util.createBuffer(bytes));
    cipher.finish();
    var encrypted = cipher.output.toHex();
	

    return forge.util.encode64(forge.util.hexToBytes(encrypted));
}

function decryptAES2(encryptedBytes,key,iv) { 	
	var aesCbc = new aesjs.ModeOfOperation.cbc(key, iv);
	var decryptedBytes = aesCbc.decrypt(encryptedBytes);
	var decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);

	return decryptedText;
}

function get_channel_data(path,channelid,ondone)
{
	var certificado=JSON.stringify({"channel":channelid});

	
	
	//console.log('g_pubkey_keyserver=', certificados.g_publickey_keyserver);
	//console.log('g_privatekey_signing=', certificados.g_privatekey_signing);

	try{
    
    certificados.encriptar_certificado(certificados.g_publickey_keyserver,certificado,function(certificado_encriptado)
    {
		certificados.firmar_certificado(certificados.g_privatekey_signing,certificado_encriptado,function(firma)
        {
			var certificadoA=certificado_encriptado+"@#@#@$$"+firma;
			
			try{

			var form = new FormData();

			form.append("op","getchanneldata");
			form.append("id",channelid);
			form.append("user",certificados.g_usuario);
			form.append("password",certificados.g_passwordhash);
			
			var file=certificadoA.toString("base64");
			//console.log("file: "+file);
			form.append('certificadoA', file,{
				filename: 'certificadoA.zip',
				contentType: 'application/zip'
			  });
			}
			catch(e)
			{
				console.log(e);
			}
			  
			//console.log("path:"+path);
			form.submit('https://www.oficloud.com'+path,function(err,res){
				if(!err)
				{
					res.on('data', (chunk) => {
						//console.log(`Received ${chunk.length} bytes of data.`);
						//console.log("Respuesta1: " + chunk);
						var json=JSON.parse(chunk);
						ondone(json);
						
					  });
                    
                    try {

                        
                    }
                    catch (e) {
                        console.log(e);
                    }
				}
				res.resume();
			})
        });
	});
	}
	catch(e)
	{
		console.log(e);
	}

}

function list_channel(path,channelid,reply_to,last_change,last,ondone)
{
	try{

		var form = new FormData();

		form.append("op","listchannel");
		form.append("id",channelid);
		form.append("last",last);
		form.append("reply_to",reply_to);
		form.append("last_change",last_change);
		form.append("user",certificados.g_usuario);
		form.append("password",certificados.g_passwordhash);
		
		
		form.submit('https://www.oficloud.com'+path,function(err,res){
			if(!err)
			{
				res.on('data', (chunk) => {
					//console.log(`Received ${chunk.length} bytes of data.`);
					//console.log("Respuesta3: " + chunk);
					var json=JSON.parse(chunk);
					ondone(json);
					
					});
			}
		});
	}
	catch(e)
	{
		console.log(e);
	}
}



exports.list_directory=function(id,order_by,last_check,pos,NFILES,ondone)
{
	if(typeof NFILES==="undefined")
		NFILES=20;
	let esto=this;

	try{

		var form = new FormData();

		form.append("op","listdirectory");
		form.append("client_id","nodejs_api");
		form.append("id",id);
		form.append("ob",order_by);
		form.append("last_change",last_check);
		form.append("n",NFILES);
		form.append("pos",pos);
		form.append("lastid",-1);
		form.append("is_check","false");

		form.append("user",certificados.g_usuario);
		form.append("password",certificados.g_passwordhash);
		
		console.log("path: "+this.api_path);

		
		form.submit('https://www.oficloud.com'+this.api_path,function(err,res){
			console.log(err);
			if(!err)
			{
				res.on('data', (chunk) => {
					//console.log(`Received ${chunk.length} bytes of data.`);
					//console.log("Respuesta3: " + chunk);
					var json=JSON.parse(chunk);
					ondone(json);
					
					});
			}
		});
	}
	catch(e)
	{
		console.log(e);
	}
}

exports.move_file=function(newdirid,fileid,tipo,nombre,filesize,ondone)
{
	console.log("mover: "+nombre);
	var ficheros=[];
	ficheros.push({id:fileid,tipo:tipo,nombre:nombre,dir:newdirid,filesize:filesize});
	this.move_files(newdirid,ficheros,ondone);
}

exports.move_files=function(newdirid,files,ondone)
{
	let esto=this;
	var certificado=JSON.stringify({"dir":newdirid,"ficheros":JSON.stringify(files)});

	try{
    
    certificados.encriptar_certificado(certificados.g_publickey_keyserver,certificado,function(certificado_encriptado)
    {
		certificados.firmar_certificado(certificados.g_privatekey_signing,certificado_encriptado,function(firma)
        {
			var certificadoA=certificado_encriptado+"@#@#@$$"+firma;
			
			try{

			var form = new FormData();

			form.append("op","movefile");
			form.append("dir",newdirid);
			form.append("ficheros",JSON.stringify(files));
			form.append("client_id","nodejs_api");
			
			form.append("user",certificados.g_usuario);
			form.append("password",certificados.g_passwordhash);
			
			var file=certificadoA.toString("base64");
			//console.log("file: "+file);
			form.append('certificadoA', file,{
				filename: 'certificadoA.zip',
				contentType: 'application/zip'
			  });
			}
			catch(e)
			{
				console.log(e);
			}
			  
			
			form.submit('https://www.oficloud.com'+esto.api_path,function(err,res){
				console.log(err);
				if(!err)
				{
					res.on('data', (chunk) => {
						console.log(`Received ${chunk.length} bytes of data.`);
						console.log("Respuesta1: " + chunk);
						var json=JSON.parse(chunk);
						ondone(json);
						
					  });
                    
                    
				}				
			})
        });
	});
	}
	catch(e)
	{
		console.log(e);
	}	
}
