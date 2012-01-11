/*
 *  12306 Auto Query => A javascript snippet to help you book tickets online.
 *  12306 Booking Assistant
 *  Copyright (C) 2011 Hidden
 * 
 *  12306 Auto Query => A javascript snippet to help you book tickets online.
 *  Copyright (C) 2011 Jingqin Lynn
 * 
 *  12306 Auto Login => A javascript snippet to help you auto login 12306.com.
 *  Copyright (C) 2011 Kevintop
 * 
 *   12306 Booking Assistant 12306 订票助手之(自动登录，自动查票，自动订单)
 *   Copyright (C) 2011 zzdhidden
 * 
 *  Includes jQuery
 *  Copyright 2011, John Resig
 *  Dual licensed under the MIT or GPL Version 2 licenses.
 *  http://jquery.org/license
 * 
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 * 
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 * 
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 * 
 */

// ==UserScript==  
// @name         12306订票助手(基于zzhhidden 1.3)
// @version	 1.0
// @author       cest713
// @namespace    https://github.com/zzdhidden
// @description  12306 订票助手之(自动登录，自动查票，自动订单)
// @include      *://dynamic.12306.cn/otsweb/loginAction.do*
// @include      *://dynamic.12306.cn/otsweb/login*
// @include	 *://dynamic.12306.cn/otsweb/order/querySingleAction.do*
// @include	 *://dynamic.12306.cn/otsweb/order/confirmPassengerAction.do*
// @require	https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js
// ==/UserScript== 

function withjQuery(callback, safe){
	if(typeof(jQuery) == "undefined") {
		var script = document.createElement("script");
		script.type = "text/javascript";
		script.src = "https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js";

		if(safe) {
			var cb = document.createElement("script");
			cb.type = "text/javascript";
			cb.textContent = "jQuery.noConflict();(" + callback.toString() + ")(jQuery);";
			script.addEventListener('load', function() {
				document.head.appendChild(cb);
			});
		}
		else {
			var dollar = undefined;
			if(typeof($) != "undefined") dollar = $;
			script.addEventListener('load', function() {
				jQuery.noConflict();
				$ = dollar;
				callback(jQuery);
			});
		}
		document.head.appendChild(script);
	} else {
		callback(jQuery);
	}
}

withjQuery(function($){
	$(document).click(function() {
		if( window.webkitNotifications && window.webkitNotifications.checkPermission() != 0 ) {
			window.webkitNotifications.requestPermission();
		}
	});
	function notify(str, timeout, skipAlert) {
		if( window.webkitNotifications && window.webkitNotifications.checkPermission() == 0 ) {
			var notification = webkitNotifications.createNotification(
				null,  // icon url - can be relative
				'订票助手',  // notification title
				str
			);
			notification.show();
			if ( timeout ) {
                                setTimeout(function() {
					notification.cancel();
				}, timeout);
			}
			return true;
		} else {
			if( !skipAlert ) {
				alert( str );
			}
			return false;
		}
	}
	function route(match, fn) {
		if( window.location.href.indexOf(match) != -1 ) {
			fn();
		};
	}

	route("querySingleAction.do", function() {

		//query

		var isTicketAvailable = false;

		//The table for displaying tickets
		var tbl = $(".obj")[0];
		if( tbl.addEventListener ) {
			// Not work on IE
			tbl.addEventListener("DOMNodeInserted", function() {
				if(checkTickets(event.target)){
					isTicketAvailable = true;
					highLightRow(event.target);
				}
				tbl.firstAppend=false;
			}, true);
		} else {
			window.$ && window.$(tbl).ajaxComplete(function() {
				$(this).find("tr").each(function(n, e) {
					if(checkTickets(e)){
						isTicketAvailable = true;
						highLightRow(e);
					}	
				});
				if(g.firstRemove) {
					g.firstRemove = false;
					if (isTicketAvailable) {
						if (isAutoQueryEnabled)
							document.getElementById("refreshButton").click();
						onticketAvailable(); //report
					}
					else {
						//wait for the button to become valid
					}
				}
			});
		}

		//Trigger the button
		var doQuery = function() {
			displayQueryTimes(queryTimes++);
			tbl.firstAppend = true;
			g.firstRemove = true;
			document.getElementById(isStudentTicket ? "stu_submitQuery" : "submitQuery").click();
		}

		var checkTickets = function(row) {
			var hasTicket = false;
			var canBook = true;
			$("td input[type=button]", row).each(function(i, e) {
				if(e.classList.contains("yuding_x")) {
					canBook = false;
				}
			});
			if(!canBook) return false;

			$("td", row).each(function(i, e) {
				if(ticketType[i-1]) {
					var info = e.innerText.trim();
					if(info != "--" && info != "无") {
						hasTicket = true;
						highLightCell(e);
					}
				}
			});

			return hasTicket;
		}

		//The box into which the message is inserted.
		var g = document.getElementById("gridbox");
		//When the message is removed, the query should be completed.
		if( g.addEventListener ) {
			g.addEventListener("DOMNodeRemoved", function() {
				if(g.firstRemove) {
					g.firstRemove = false;
					if (isTicketAvailable) {
						if (isAutoQueryEnabled)
							document.getElementById("refreshButton").click();
						onticketAvailable(); //report
					}
					else {
						//wait for the button to become valid
					}
				}
			}, true);
		}

		//hack into the validQueryButton function to detect query
		var _validQueryButton = validQueryButton;

		validQueryButton = function() {
			_validQueryButton();
			if(isAutoQueryEnabled) doQuery();
		}

		var queryTimes = 0; //counter
		var isAutoQueryEnabled = false; //enable flag

		//please DIY:
		var audio = null;

		var onticketAvailable = function() {
			if(window.Audio) {
				if(!audio) {
					audio = new Audio("http://www.w3school.com.cn/i/song.ogg");
					audio.loop = false;
				}
				audio.play();
				notify("可以订票了！", 4000);
			} else {
				notify("可以订票了！",4000);
			}
		}
		var highLightRow = function(row) {
			//$(row).css("background-color", "red");
			$(row).css("background-color", "#D1E1F1");
		}
		var highLightCell = function(cell) {
			//$(cell).css("background-color", "blue");
			$(cell).css("background-color", "#2CC03E");
		}
		var displayQueryTimes = function(n) {
			document.getElementById("refreshTimes").innerText = n;
		};

		var isStudentTicket = false;

		//Control panel UI
		var ui = $("<div>请先选择好出发地，目的地，和出发时间。&nbsp;&nbsp;&nbsp;</div>")
			.append(
				$("<input id='isStudentTicket' type='checkbox' />").change(function(){
					isStudentTicket = this.checked;
				})
			)
			.append(
				$("<label for='isStudentTicket'></label>").html("学生票&nbsp;&nbsp;")
			)
			.append(
				$("<button style='padding: 5px 10px; background: #2CC03E;border-color: #259A33;border-right-color: #2CC03E;border-bottom-color:#2CC03E;color: white;border-radius: 5px;text-shadow: -1px -1px 0 rgba(0, 0, 0, 0.2);'/>").attr("id", "refreshButton").html("开始刷票").click(function() {
					if(!isAutoQueryEnabled) {
						isTicketAvailable = false;
						if(audio && !audio.paused) audio.pause();
						isAutoQueryEnabled = true;
						doQuery();
						this.innerText="停止刷票";
					}
					else {
						isAutoQueryEnabled = false;
						this.innerText="开始刷票";
					}
				})
			)
			.append(
				$("<span>").html("&nbsp;&nbsp;尝试次数：").append(
					$("<span/>").attr("id", "refreshTimes").text("0")
				)
			)
			.append( 
				//Custom ticket type
				$("<div>如果只需要刷特定的票种，请在余票信息下面勾选。</div>")
					.append($("<a href='#' style='color: blue;'>只勾选坐票&nbsp;&nbsp;</a>").click(function() {
						$(".hdr tr:eq(2) td").each(function(i,e) {
							$(this).find("input").attr("checked", $(this).text().indexOf("座") != -1 ).change();
						});
						return false;
					}))
					.append($("<a href='#' style='color: blue;'>只勾选卧铺&nbsp;&nbsp;</a>").click(function() {
						$(".hdr tr:eq(2) td").each(function(i,e) {
							$(this).find("input").attr("checked", $(this).text().indexOf("卧") != -1 ).change();
						});
						return false;
					}))
			);
		var container = $(".cx_title_w:first");
		container.length ?
			ui.insertBefore(container) : ui.appendTo(document.body);

		//Ticket type selector & UI
		var ticketType = new Array();
		$(".hdr tr:eq(2) td").each(function(i,e) {
			ticketType.push(false);
			if(i<3) return;
			ticketType[i] = true;

			var c = $("<input/>").attr("type", "checkBox").attr("checked", true);
			c[0].ticketTypeId = i;
			c.change(function() {
				ticketType[this.ticketTypeId] = this.checked;
			}).appendTo(e);
		});
	});
	route("login", function() {
		//login
		var url = "https://dynamic.12306.cn/otsweb/loginAction.do?method=login";
		var queryurl = "https://dynamic.12306.cn/otsweb/order/querySingleAction.do?method=init";
		//Check had login, redirect to query url
		if( parent && parent.$ ) {
			var str = parent.$("#username_ a").attr("href");
			if( str && str.indexOf("sysuser/user_info") != -1){	
				//如果是点击的是我的12306,要不跳转
			        if(window.location.href.indexOf("initForMy12306") != -1 )
			        return;
				window.location.href = queryurl;
				return;
			}
		};

		function submitForm(){
			var submitUrl = url;
			$.ajax({
				type: "POST",
				url: submitUrl,
				data: {
					"loginUser.user_name": $("#UserName").val()
				  , "user.password": $("#password").val()
				  , "randCode": $("#randCode").val()
				},
				timeout: 30000,
				//cache: false,
				//async: false,
				success: function(msg){
					if (msg.indexOf('请输入正确的验证码') > -1) {
						alert('请输入正确的验证码！');
						return;
					}
					if ( msg.indexOf('当前访问用户过多') > -1 || msg.match(/var\s+isLogin\s*=\s*false/i)) {
					        reLogin();
					}
					else {
						notify("登录成功，开始查询车票吧！", 10000);
						//notify("登录成功，开始查询车票吧！", 4000,false);
						window.location.replace( queryurl );
					};
				},
				error: function(msg){
					reLogin();
				},
				beforeSend: function(XHR){
					//alert("Data Saved: " + XHR);
				}
			});
		}

		var count = 1;
		function reLogin(){
			count ++;
			$('#refreshButton').html("("+count+")次登录中...");
			setTimeout(submitForm, 600);
		}
		//初始化
		$("#subLink").after($("<a href='#' style='padding: 5px 10px; background: #2CC03E;border-color: #259A33;border-right-color: #2CC03E;border-bottom-color:#2CC03E;color: white;border-radius: 5px;text-shadow: -1px -1px 0 rgba(0, 0, 0, 0.2);'/>").attr("id", "refreshButton").html("自动登录").click(function() {
			count = 1;
			$(this).html("(1)次登录中...");
			//notify('开始尝试登录，请耐心等待！', 400);
			  alert('如果使用自动登录功能，请输入用户名、密码及验证码后，点击自动登录，系统会尝试登录，直至成功！');
			submitForm();
			return false;
		}));

		alert('如果使用自动登录功能，请输入用户名、密码及验证码后，点击自动登录，系统会尝试登录，直至成功！');
	});
	route("confirmPassengerAction.do", function() {
		/**
		 * Auto Submit Order
		 * From: https://gist.github.com/1577671
		 * Author: kevintop@gmail.com  
		 */
		//Auto select the first user when not selected
		if( !$("input._checkbox_class:checked").length ) {
			$("input._checkbox_class:first").click();
		}
		//passengerTickets
               // var userInfoUrl = 'https://dynamic.12306.cn/otsweb/sysuser/user_info.jsp';
		var userInfoUrl = 'https://dynamic.12306.cn/otsweb/order/myOrderAction.do?method=queryMyOrderNotComplete&leftmenu=Y';
		var count = 1;
		var t;
	        var doing = false;
	        var info="";
		function submitForm(){
			var wantDate = $("#startdatepicker").val();
	          	$("#start_date").val(wantDate);
	        	$("#_train_date_str").val(wantDate);
	        	if(window.submit_form_check && !submit_form_check("confirmPassenger") ) { 
					return;
				}
			jQuery.ajax({
					url: $("#confirmPassenger").attr('action'),
					data: $('#confirmPassenger').serialize(),
					type: "POST",
					timeout: 30000,
					success: function(msg)
					{
						//Refresh token
						var match = msg && msg.match(/org\.apache\.struts\.taglib\.html\.TOKEN['"]?\s*value=['"]?([^'">]+)/i);
						var newToken = match && match[1];
						if(newToken) {
							$("input[name='org.apache.struts.taglib.html.TOKEN']").val(newToken);
						}

						if( msg.indexOf('payButton') > -1 ) {
							//Success!
							alert("车票预订成功，恭喜!");
							notify("车票预订成功，恭喜!",500);
							window.location.replace(userInfoUrl);
							return;
						}else if(msg.indexOf('未处理的订单') > -1){
                                                        alert("有未处理的订单,或车票预订成功!");
							window.location.replace(userInfoUrl);
							return;
                                                }
						var reTryMessage = ['用户过多','确认客票的状态后再尝试后续操作','请不要重复提交'];
							for (var i = reTryMessage.length - 1; i >= 0; i--) {
								if( msg.indexOf( reTryMessage[i] ) > -1 ) {
									showMsg(reTryMessage[i]);
									if (doing){
										reSubmitForm();
									}
									return;
							}
						};
						//Parse error message
						msg = msg.match(/var\s+message\s*=\s*"([^"]*)/);
						stop(msg && msg[1] || '出错了。。。。 啥错？ 我也不知道。。。。。');
					},
					error: function(msg){
						showMsg(msg);
						reSubmitForm();
					}
				});
	};
	function showMsg(msg){
	                 //每行显示4个
	                 if (count%5==0){
	                  	info=info+"</tr><tr>"+"<td width='25%'>第"+count+"次："+msg+"</td>";
	                  } else
	                   info=info+"<td width='25%'>第"+count+"次："+msg+"</td>";
	                  $("#msg_div").html("<table id='msg_div' width='100%'><tr><td>返回信息:</td></tr><tr>"+info+"</tr></table>");
	                 //$("#msg_div").html($("#msg_div").html() + "<div>第"+count+"次："+msg+"</div>");
	}
	function reSubmitForm(){
		count ++;
		$('#refreshButton').html("("+count+")次自动提交中...单击停止");
		//setTimeout(submitForm, 500);
	}
	function reloadSeat(){
		//默认勾选系统定的席别,将其他的席别变为可用状态，不影响当天预订
		var oseat =$("select[name$='_seat']").val();
		$("select[name$='_seat']").html('<option value="1">硬座</option><option value="3" selected>硬卧</option><option value="2" selected>软座</option><option value="4">软卧</option><option value="M">一等座</option><option value="O">二等座</option>');
                $("select[name$='_seat']").html($("select[name$='_seat']").html+'<option value="1">硬座</option><option value="3" selected>硬卧</option><option value="2" selected>软座</option><option value="4">软卧</option><option value="M">一等座</option><option value="O">二等座</option>');
                $("select[name$='_seat']").val(oseat);	
	
	}
	//初始化
	function stop ( msg ) {
			clearInterval(t);
			t = 0;
			doing=false;
			count = 0;			
			if(msg!="")alert( msg );
			info="";
			$('#msg_div').html("");
			$('#refreshButton').html("自动提交订单");			
			$(":button").attr("disabled",false);
                	$(":button").removeClass("long_button_x");
                	
		}
    if($("#refreshButton").size()<1){
			//重置后加载所有席别
			$("select[name$='_seat']") .each(function(){this.blur(function(){
				alert(this.attr("id") + "blur");
			});});
			//初始化所有席别
			$(".qr_box :checkbox[name^='checkbox']").each(function(){$(this).click(reloadSeat)});
			reloadSeat();
			//$(".conWrap").append("<div id='msg_div'></div>");		
			$(".conWrap").append("<table id='msg_div' width='100%'>"+info+"</table>");
			//日期可选,修正方框内容有年月日，应该是YYYY－MM—DD格式
			//$("td.bluetext:first").html('<input type="text" name="orderRequest.train_date" value="' +$("td.bluetext:first").html()+'" id="startdatepicker" style="width: 150px;" class="input_20txt"  onfocus="WdatePicker({firstDayOfWeek:1})" />');
			$("td.bluetext:first").html('<input type="text" name="orderRequest.train_date" value="' +$("#start_date").val()+'" id="startdatepicker" style="width: 150px;" class="input_20txt"  onfocus="WdatePicker({firstDayOfWeek:1})" />');
			$(".tj_btn").append($("<a href='#' style='padding: 5px 10px; background: #2CC03E;border-color: #259A33;border-right-color: #2CC03E;border-bottom-color:#2CC03E;color: white;border-radius: 5px;text-shadow: -1px -1px 0 rgba(0, 0, 0, 0.2);'/>").attr("id", "refreshButton").html("自动提交订单").click(function() {
		               if (doing == true){
					stop("");
					return false;
				}else {
					if(window.submit_form_check && !submit_form_check("confirmPassenger") ) { 
						return;
					}
					count = 1;
					$(this).html("(1)次提交中...单击停止");
					var freq;
					switch($("#freq").val()){
						case '0':
							freq = 500;
							break;
						case '1':
						default:
							freq = 1000;
							break;
						case '2':
							freq = 2000;
							break;
					}
					t = setInterval(submitForm, freq);
					//submitForm();
				}
				doing = !doing;
			    return false;
		    }));
		$(".tj_btn").append("自动提交频率：<select id='freq' ><option value='0' >频繁</option><option value='1' selected='' >正常</option><option value='2' >缓慢</option></select>");
		$(".tj_btn").focus();
		alert('如果使用自动提交订单功能，请在确认订单正确无误后，再点击自动提交按钮！');
		}
	});
}, true);
