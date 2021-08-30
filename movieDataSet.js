const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const getHTML = async(year, page) => {
    try{
        return await axios.get(`https://movie.naver.com/movie/sdb/browsing/bmovie.naver?open=${year}&page=${page}`)
    }catch(err){
        console.log(err)
    }
    
}
const parsing= async(year, page, callback) => {
    const html = await getHTML(year, page);
    
    const $ = cheerio.load(html.data); 

    let list = new Array();
    let len = $("ul.directory_list").children("li").length;

    for(let i=0; i<len; i++ ){
        let mvLink = $("ul.directory_list").children(`li:eq(${i})`).children("a").attr("href"); //영화링크
        if(mvLink !== undefined){
            list.push(mvLink.split('code=')[1]);
        }
    }
    callback(list);
}

const getHTMLDetail = async(keyword) => {
    try{
        return await axios.get("https://movie.naver.com/movie/bi/mi/basic.nhn?code="+keyword)
    }catch(err){
        console.log(err)
    }
    
}

const parsingDetail = async(keyword, callback) => {
    const html = await getHTMLDetail(keyword);
    
    const $ = cheerio.load(html.data); 


    let item = new Object();
    let show = false;
    let title = $(".mv_info").find(`h3>a`).text()
    if(title.includes('상영중')){
        title = title.split('상영중')[0];
        show = true;
    }else{
        title = title.substring(0,title.length/2);
    }
    let summary = $(".story_area").find(".con_tx").text()
    let genre = $(".info_spec").find("span:first").text().trim()
    genre = genre.replace(/(\r\n\t|\n|\r\t|\t)/gm,"")
    summary = summary.replace(/(\r\n\t|\n|\r\t|\t)/gm,"")

    summary = summary.replace(/\,/g,'');
    genre = genre.replace(/\,/g,'');
    title = title.replace(/\,/g,'');
    
    item = {
        "movieCode":keyword,
        "title": title,
        "summary": summary,
        "genres" : genre,
    }

    callback(item);
}

function jsonToCSV(json_data) {
    const json_array = json_data;
    let csv_string = '';
    const titles = Object.keys(json_array[0]);
    titles.forEach((title,index)=>{
        csv_string += (index !== titles.length-1 ? `${title},`:`${title}\r\n`);
    })
    json_array.forEach((content, index)=>{
        let row='';
        for(let title in content){
            row += (row === '' ? `${content[title]}` : `,${content[title]}`);
        }
        csv_string += (index !== json_array.length-1 ? `${row}\r\n`: `${row}`); 
    })

    return csv_string;
}

let movieList = new Array();
let movieListDetail = new Array();
let count = 0;
let count2 = 0;
for(let i=1; i<31; i++){ //페이지 개수
    parsing(2021,i,function(res){ //개봉연도
        movieList = movieList.concat(res);
        count++;
        if(count===30){ //페이지 끝까지 데이터 가져왔는지 확인
            for(let j=0; j<movieList.length; j++){
                parsingDetail(movieList[j], function(result){
                    movieListDetail.push(result);
                    count2++;
                    if(count2===movieList.length){
                        const csv_string = jsonToCSV(movieListDetail);
                        fs.writeFileSync('movieDataSet.csv',csv_string)
                    }
                })

            }
        }
    })
}

