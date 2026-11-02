/* Offline calendar and date converter; Gregorian, Persian, Islamic Umm al-Qura. */
(() => {
  const calendars = {
    gregory: {label:'میلادی',id:'gregory',locale:'en-u-ca-gregory',offset:0},
    persian: {label:'شمسی',id:'persian',locale:'en-u-ca-persian',offset:621},
    islamic: {label:'قمری',id:'islamic-umalqura',locale:'en-u-ca-islamic-umalqura',offset:579}
  };
  const monthNames = {
    gregory:['ژانویه','فوریه','مارس','آوریل','مه','ژوئن','ژوئیه','اوت','سپتامبر','اکتبر','نوامبر','دسامبر'],
    persian:['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'],
    islamic:['محرم','صفر','ربیع‌الاول','ربیع‌الثانی','جمادی‌الاول','جمادی‌الثانی','رجب','شعبان','رمضان','شوال','ذیقعده','ذیحجه']
  };
  const formatters=Object.fromEntries(Object.entries(calendars).map(([k,c])=>[k,new Intl.DateTimeFormat(c.locale,{year:'numeric',month:'numeric',day:'numeric',timeZone:'UTC',numberingSystem:'latn'})]));
  const dayMillis=86400000;
  const dateUTC=(y,m,d)=>{const dt=new Date(0);dt.setUTCHours(12,0,0,0);dt.setUTCFullYear(y,m-1,d);return dt};
  const parts=(date,cal)=>{const obj={};for(const p of formatters[cal].formatToParts(date)){if(['year','month','day'].includes(p.type))obj[p.type]=Number(p.value)}return {y:obj.year,m:obj.month,d:obj.day}};
  const compare=(a,b)=>a.y-b.y||a.m-b.m||a.d-b.d;
  const shift=(date,days)=>new Date(date.getTime()+days*dayMillis);
  const rangeValid=(y,m,d)=>Number.isInteger(y)&&Number.isInteger(m)&&Number.isInteger(d)&&y>=1&&y<=3000&&m>=1&&m<=12&&d>=1&&d<=31;
  function convertToDate(cal,y,m,d){
    if(!rangeValid(y,m,d))return null;
    if(cal==='gregory'){const v=dateUTC(y,m,d);return v.getUTCFullYear()===y&&v.getUTCMonth()+1===m&&v.getUTCDate()===d?v:null}
    // Binary search for the civil date: Intl provides the actual calendar rules.
    // Keep within supported modern dates to avoid out-of-range Intl calendars.
    const approximate=cal==='persian'?y+621:Math.round(622+(y-1)*354.367/365.2425);
    let low=Math.floor(dateUTC(approximate-2,1,1).getTime()/dayMillis);
    let high=Math.floor(dateUTC(approximate+3,1,1).getTime()/dayMillis);
    const target={y,m,d};
    while(low<=high){
      const mid=Math.floor((low+high)/2),date=new Date(mid*dayMillis+12*3600000);
      const cmp=compare(parts(date,cal),target);
      if(cmp===0)return date;
      if(cmp<0)low=mid+1;else high=mid-1;
    }
    return null;
  }
  const persianDigits=s=>String(s).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
  const iso=(d)=>d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');
  const dateLabel=(dt,cal)=>{const p=parts(dt,cal);return persianDigits(p.d+' '+monthNames[cal][p.m-1]+' '+p.y)};
  const todayUTC=()=>{const n=new Date();return dateUTC(n.getFullYear(),n.getMonth()+1,n.getDate())};
  let anchor=todayUTC(),displayCal='persian',selected=todayUTC(),widgetRoot=null;
  const choices=Object.entries(calendars).map(([k,c])=>'<option value="'+k+'">'+c.label+'</option>').join('');
  function renderCalendar(root){
    const el=card('calendar','📅 تقویم سه‌گانه', 
      '<div class="calendar-toolbar"><select class="card-input calendar-type" aria-label="نوع تقویم">'+choices+'</select><button type="button" class="mini-button cal-prev" aria-label="ماه قبل">❮</button><b class="cal-title"></b><button type="button" class="mini-button cal-next" aria-label="ماه بعد">❯</button></div>'+
      '<div class="calendar-weekdays"></div><div class="calendar-days"></div>'+
      '<div class="calendar-selected"></div><details class="converter-panel" open><summary>تبدیل تاریخ شمسی، میلادی و قمری</summary>'+
      '<div class="converter-inputs"><label>نوع تاریخ ورودی<select class="card-input convert-from">'+choices+'</select></label>'+
      '<label>سال<input type="number" class="card-input convert-year" min="1" max="3000" inputmode="numeric"></label>'+
      '<label>ماه<select class="card-input convert-month"></select></label>'+
      '<label>روز<input type="number" class="card-input convert-day" min="1" max="31" inputmode="numeric"></label></div>'+
      '<button type="button" class="primary-btn convert-action">تبدیل تاریخ</button><div class="conversion-result" aria-live="polite"></div>'+
      '<p class="subtle">قمری بر پایه تقویم محاسباتی ام‌القری است؛ تاریخ رؤیت هلال ممکن است یک روز تفاوت داشته باشد.</p></details>');
    widgetRoot=el;
    const type=el.querySelector('.calendar-type');
    type.value=displayCal;
    type.onchange=()=>{displayCal=type.value;anchor=selected;drawMonth()};
    el.querySelector('.cal-prev').onclick=()=>changeMonth(-1);
    el.querySelector('.cal-next').onclick=()=>changeMonth(1);
    el.querySelector('.convert-from').onchange=()=>{fillConversion(selected,el.querySelector('.convert-from').value)};
    el.querySelector('.convert-action').onclick=runConversion;
    fillConversion(selected,'persian');
    drawMonth();
    root.append(el);
  }
  function changeMonth(dir){
    const p=parts(anchor,displayCal);
    let y=p.y,m=p.m+dir;if(m<1){m=12;y--}if(m>12){m=1;y++}
    const next=convertToDate(displayCal,y,m,1);if(next){anchor=next;drawMonth()}
  }
  function drawMonth(){
    const el=widgetRoot;if(!el||!el.isConnected&&el.parentNode===null)return;
    const p=parts(anchor,displayCal),first=convertToDate(displayCal,p.y,p.m,1);
    if(!first)return;
    el.querySelector('.cal-title').textContent=monthNames[displayCal][p.m-1]+' '+persianDigits(p.y);
    const weekdays=el.querySelector('.calendar-weekdays');weekdays.innerHTML='';
    ['ش','ی','د','س','چ','پ','ج'].forEach(x=>{const s=document.createElement('span');s.textContent=x;weekdays.append(s)});
    const days=el.querySelector('.calendar-days');days.innerHTML='';
    const offset=(first.getUTCDay()+1)%7;
    for(let i=0;i<offset;i++){const empty=document.createElement('span');empty.className='cal-empty';days.append(empty)}
    for(let i=0;i<31;i++){
      const date=shift(first,i),day=parts(date,displayCal);
      if(day.y!==p.y||day.m!==p.m)break;
      const b=document.createElement('button');b.type='button';b.className='calendar-day';b.textContent=persianDigits(day.d);
      if(iso(date)===iso(todayUTC()))b.classList.add('is-today');
      if(iso(date)===iso(selected))b.classList.add('is-selected');
      b.title=dateLabel(date,'persian')+' / '+dateLabel(date,'gregory')+' / '+dateLabel(date,'islamic');
      b.onclick=()=>{selected=date;fillConversion(date,el.querySelector('.convert-from').value);drawMonth()};
      days.append(b);
    }
    el.querySelector('.calendar-selected').textContent='انتخاب‌شده: '+dateLabel(selected,'persian')+' | '+dateLabel(selected,'gregory')+' | '+dateLabel(selected,'islamic');
  }
  function fillConversion(date,cal){
    const el=widgetRoot;if(!el)return;
    el.querySelector('.convert-from').value=cal;
    const p=parts(date,cal);
    const month=el.querySelector('.convert-month');month.innerHTML='';
    monthNames[cal].forEach((name,i)=>{const option=document.createElement('option');option.value=i+1;option.textContent=name;month.append(option)});
    month.value=String(p.m);el.querySelector('.convert-year').value=p.y;el.querySelector('.convert-day').value=p.d;
    runConversion();
  }
  function runConversion(){
    const el=widgetRoot;if(!el)return;
    const from=el.querySelector('.convert-from').value;
    const y=Number(el.querySelector('.convert-year').value),m=Number(el.querySelector('.convert-month').value),d=Number(el.querySelector('.convert-day').value);
    const out=el.querySelector('.conversion-result');out.innerHTML='';
    const date=convertToDate(from,y,m,d);
    if(!date||date.getUTCFullYear()<1900||date.getUTCFullYear()>2100){out.textContent='تاریخ نامعتبر است یا خارج از محدوده پشتیبانی (۱۹۰۰ تا ۲۱۰۰ میلادی) قرار دارد.';return}
    selected=date;
    for(const [cal,config] of Object.entries(calendars)){
      const line=document.createElement('div');line.className='converted-line';
      const label=document.createElement('span');label.textContent=config.label;
      const value=document.createElement('strong');value.textContent=dateLabel(date,cal);
      line.append(label,value);out.append(line);
    }
    drawMonth();
  }
  window.MySpaceCalendar={renderCalendar,convertToDate,parts};
})();