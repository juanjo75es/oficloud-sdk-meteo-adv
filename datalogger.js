var fs = require('fs');
var lineReader = require('line-reader');

module.exports=class datalogger{



constructor(name,onnewhour,onnewday,onnewmonth,onnewyear)
{
    this.name=name;
    this.on_new_hour=onnewhour;
    this.on_new_day=onnewday;
    this.on_new_month=onnewmonth;
    this.on_new_year=onnewyear;

    this.day_log=[];
    this.month_log=[];
    this.year_log=[];
    this.years_log=[];

    this.current_day=0;
    this.current_month;
    this.current_year;

    this.load();
}


load_array(sufix,ondone)
{
    let esto=this;
    var arr=[];
    
    lineReader.eachLine(this.name+sufix+'.txt', function(line, last) {
        //console.log(line);
        // do whatever you want with line...
        arr.push(JSON.parse(line));
        if(last){
          // or check if it's the last one
          var a=JSON.parse(line);
          var d=new Date(a.date);
          esto.current_hour=d.getHours();
          esto.current_day=d.getDate();
          esto.current_month=d.getMonth();
          esto.current_year=d.getFullYear();

          console.log("current hour: "+esto.current_hour);
          console.log("array "+sufix+": "+JSON.stringify(arr));

          
        }
      },function (err){
        ondone(arr);
      });
}

save_array(sufix,arr)
{
    var file = fs.createWriteStream(this.name+sufix+'.txt');
    file.on('error', function(err) { /* error handling */ });
    arr.forEach(function(v) { file.write(JSON.stringify(v) + '\n'); });
    file.end();
    console.log("save array "+sufix+": "+JSON.stringify(arr));
}

load()
{
    let esto=this
    esto.load_array("_years",function(arr){
        esto.years_log=arr;
        esto.load_array("_year",function(arr){
            esto.year_log=arr;
            esto.load_array("_month",function(arr){
                esto.month_log=arr;
                esto.load_array("_day",function(arr){
                    esto.day_log=arr;
                    esto.load_array("_hour",function(arr){
                        esto.hour_log=arr;
                    });
                });
            });
        });
    });
}

save()
{
    this.save_array("_hour",this.hour_log);
    this.save_array("_day",this.day_log);
    this.save_array("_month",this.month_log);
    this.save_array("_year",this.year_log);
    this.save_array("_years",this.years_log);
}


add(date,data)
{
    var hour=date.getHours();
    var day=date.getDate();
    var month=date.getMonth();
    var year=date.getFullYear();

    console.log("current day vs day: "+this.current_day+" - "+day);

    if(this.current_day==0) //if not saved before
    {
        this.current_day=day;
        this.current_month=month;
        this.current_year=year;
    }
    else
        if(hour!=this.current_hour)
        {
            console.log("on new hour");
            var new_record=this.on_new_hour(this.hour_log);
            this.day_log.push(new_record);
            this.hour_log=[];
            this.current_hour=hour;
        }
    {
        if(day!=this.current_day)
        {
            console.log("on new day");
            var new_record=this.on_new_day(this.day_log);
            this.month_log.push(new_record);
            this.day_log=[];
            this.current_day=day;
        }

        if(month!=this.current_month)
        {
            var new_record=this.on_new_month(this.month_log);
            this.year_log.push(new_record);
            this.month_log=[];
            this.current_month=month;
        }

        if(year!=this.current_year)
        {
            var new_record=this.on_new_year(this.year_log);
            this.years_log.push(new_record);
            this.year_log=[];
            this.current_year=year;
        }
    }

    this.hour_log.push(data);
    this.save();
}

}

