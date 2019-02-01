var oficloud = require('./oficloud');
var datalogger = require('./datalogger');
var SerialPort = require('serialport');
var gpio = require('rpi-gpio')
var gpiop = gpio.promise;
var dateFormat = require('dateformat');

function setMode(mode)
{
    var m0=1;
    var m1=1;

    switch(mode)
    {
        case 0://normal
            m0=0;
            m1=0;
        break;
        case 1://wake-up
            m0=0;
            m1=1;
        break;
        case 2://power-saving
            m0=1;
            m1=0;
        break;
        case 3://sleep
            m0=1;
            m1=1;
        break;
    }
    try{
        gpiop.write(11, m0)
        gpiop.write(13, m1)
    }
    catch(err)
    {
        console.log('Error: ', err.toString())
    }


}


function init(ondone)
{
    gpiop.setup(11, gpio.DIR_OUT)
        .then(() => {
            gpiop.setup(13, gpio.DIR_OUT)
            .then(() => {
                ondone();
            })
            .catch((err) => {
                console.log('Error: ', err.toString())
            })    
        })
        .catch((err) => {
            console.log('Error: ', err.toString())
        })
}

var serialPort = new SerialPort("/dev/ttyUSB0", {
    baudRate: 9600,
    parser: new SerialPort.parsers.Readline("\n")
});


oficloud.login('MYEMAIL@mail.com','MYPASSWORD',function(res){
    console.log("login res: "+res.res);
    
    if(res.e==-1)
        return;
    

	function onmsg(msg)
	{
		//Process received messages here
	}

	oficloud.open_channel('p',onmsg,function(err){

        if(typeof err !="undefined")
        {
            console.log("open channel error: "+err);
            return;
        }


        //Do your stuff here once you are logged in and joined a channel
        //(...)
        init(function (){
            setMode(3);
            var buf = new Buffer.from([ 0xC0, 0x05, 0x01, 0x1A, 17, 44 ]);
            //var buf = new Buffer([ 0xC3, 0xC3,0xC3 ]);
            serialPort.write(buf);
            setMode(0);
        });

	})
});


function data2float(data,pos)
{
	var d=data.slice(pos,pos+4);
	var res=new Float32Array(new Uint8Array(d).buffer)[0];
	return res;
}

function on_new_hour(data_array)
{
    var t=0,h=0,r=0;
    var maxt=0,mint=9999;
    var maxh=0,minh=9999;
    var max_date=new Date("1900/01/01");
    for(var i=0;i<data_array.length;i++)
    {
        var date=new Date(data_array[i].date);
        if(date>max_date)
            max_date=date;
        if(data_array[i].temp>maxt)
            maxt=data_array[i].temp;
        if(data_array[i].hum>maxh)
            maxh=data_array[i].hum;
        if(data_array[i].temp<mint)
            mint=data_array[i].temp;
        if(data_array[i].hum<minh)
            minh=data_array[i].hum;
        t+=data_array[i].temp;
        h+=data_array[i].hum;
        if(data_array[i].rain=="rain")
            r+=1;
    }
    var mt=t/data_array.length;
    var mh=h/data_array.length;
    var mr=r/data_array.length;

    var today0 = new Date();
    var today=dateFormat(today0, "yyyy-mm-dd H:MM:ss");
    var s="{\"date\":\""+today+"\",\"mean_rain\":"+mr.toFixed(1)+",\"temperature\":"+mt.toFixed(1)+",\"humidity\":"+mh.toFixed(1)+"}";
    oficloud.send_post('p_day',s,function(){
        
    });

    return({"date":max_date,"temp":mt,"hum":mh,"rain":mr,"max_temp":maxt,"min_temp":mint,"max_hum":maxh,"min_hum":minh});
}

function on_new_day(data_array)
{
    var t=0,h=0,r=0;
    var maxt=0,mint=9999;
    var maxh=0,minh=9999;
    var max_date=new Date("1900/01/01");
    for(var i=0;i<data_array.length;i++)
    {
        var date=new Date(data_array[i].date);
        if(date>max_date)
            max_date=date;
        if(data_array[i].max_temp>maxt)
            maxt=data_array[i].max_temp;
        if(data_array[i].max_hum>maxh)
            maxh=data_array[i].max_hum;
        if(data_array[i].min_temp<mint)
            mint=data_array[i].min_temp;
        if(data_array[i].min_hum<minh)
            minh=data_array[i].min_hum;
        t+=data_array[i].temp;
        h+=data_array[i].hum;
        r+=data_array[i].rain;
    }
    var mt=t/data_array.length;
    var mh=r/data_array.length;
    var mr=h/data_array.length;

    var today0 = new Date();
    var today=dateFormat(today0, "yyyy-mm-dd H:MM:ss");
    var s="{\"date\":\""+today+"\",\"mean_rain\":"+mr.toFixed(1)+",\"temperature\":"+mt.toFixed(1)+",\"humidity\":"+mh.toFixed(1)+"}";
    oficloud.send_post('p_month',s,function(){
        
    });

    return({"date":max_date,"temp":mt,"hum":mh,"rain":mr,"max_temp":maxt,"min_temp":mint,"max_hum":maxh,"min_hum":minh});
}

function on_new_month(data_array)
{
    var t=0,h=0,r=0;
    var maxt=0,mint=9999;
    var maxh=0,minh=9999;
    var max_date=new Date("1900/01/01");
    for(var i=0;i<data_array.length;i++)
    {
        var date=new Date(data_array[i].date);
        if(date>max_date)
            max_date=date;
        if(data_array[i].max_temp>maxt)
            maxt=data_array[i].max_temp;
        if(data_array[i].max_hum>maxh)
            maxh=data_array[i].max_hum;
        if(data_array[i].min_temp<mint)
            mint=data_array[i].min_temp;
        if(data_array[i].min_hum<minh)
            minh=data_array[i].min_hum;
        t+=data_array[i].temp;
        h+=data_array[i].hum;
        r+=data_array[i].rain;
    }
    var mt=t/data_array.length;
    var mh=r/data_array.length;
    var mr=h/data_array.length;

    var today0 = new Date();
    var today=dateFormat(today0, "yyyy-mm-dd H:MM:ss");
    var s="{\"date\":\""+today+"\",\"mean_rain\":"+mr.toFixed(1)+",\"temperature\":"+mt.toFixed(1)+",\"humidity\":"+mh.toFixed(1)+"}";
    oficloud.send_post('p_year',s,function(){
        
    });

    return({"date":max_date,"temp":mt,"hum":mh,"rain":mr,"max_temp":maxt,"min_temp":mint,"max_hum":maxh,"min_hum":minh});
}

function on_new_year(data_array)
{
    var t=0,h=0,r=0;
    var maxt=0,mint=9999;
    var maxh=0,minh=9999;
    var max_date=new Date("1900/01/01");
    for(var i=0;i<data_array.length;i++)
    {
        var date=new Date(data_array[i].date);
        if(date>max_date)
            max_date=date;
        if(data_array[i].max_temp>maxt)
            maxt=data_array[i].max_temp;
        if(data_array[i].max_hum>maxh)
            maxh=data_array[i].max_hum;
        if(data_array[i].min_temp<mint)
            mint=data_array[i].min_temp;
        if(data_array[i].min_hum<minh)
            minh=data_array[i].min_hum;
        t+=data_array[i].temp;
        h+=data_array[i].hum;
        r+=data_array[i].rain;
    }
    var mt=t/data_array.length;
    var mh=r/data_array.length;
    var mr=h/data_array.length;

    var today0 = new Date();
    var today=dateFormat(today0, "yyyy-mm-dd H:MM:ss");
    var s="{\"date\":\""+today+"\",\"mean_rain\":"+mr.toFixed(1)+",\"temperature\":"+mt.toFixed(1)+",\"humidity\":"+mh.toFixed(1)+"}";
    oficloud.send_post('p_years',s,function(){

    });

    return({"date":max_date,"temp":mt,"hum":mh,"rain":mr,"max_temp":maxt,"min_temp":mint,"max_hum":maxh,"min_hum":minh});
}


var mylog= new datalogger("meteo",on_new_hour,on_new_day,on_new_month,on_new_year);


var g_data=[];
var g_data_length=0;

serialPort.on('data', function(data){
    console.log(data);
    console.log("size: "+data.length);
    for(var i=0;i<data.length;i++)
    {
        g_data[g_data_length]=data[i];
        g_data_length++;
        if(g_data_length==9)
        {
    try{
            //sensor.read(22, 4, function(err, temperature, humidity) {

                //if (!err) 
        {
            var temperature=data2float(g_data,1);
            var humidity=data2float(g_data,5);
            var state="dry";
            if(g_data[0])
                state="wet";
            var today0 = new Date();
            var today=dateFormat(today0, "yyyy-mm-dd H:MM:ss");
            var s="{\"date\":\""+today+"\",\"state\":\""+state+"\",\"temperature\":"+temperature.toFixed(1)+",\"humidity\":"+humidity.toFixed(1)+"}";
            console.log(s);
            oficloud.send_post('p',s,function(){
                mylog.add(today0,{"date":today0,"temp":temperature,"hum":humidity,"rain":state});
            })                    
        }
            //});
        }
    catch(e){console.log(e.toString())}
            g_data_length=0;
        }
    }
    

});


