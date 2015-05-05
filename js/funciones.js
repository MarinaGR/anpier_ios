var api_url='http://anpier.org/api.php';
var api_leco='http://anpier.api.lecturacontador.com/api/';
var extern_url='http://www.anpier.org/';
var local_url='./resources/json/';
var storage_url='Anpier/resources/';

var senderID="382152538518";

var online;
var id_notificacion=0;
var pushNotification;

var mantenedor_instalacion = new Array();

var now = new Date().getTime();

var daysNamesMini=new Array('Do','Lu','Ma','Mi','Ju','Vi','Sa');
var monthNames=new Array('Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre');

var FLAG_NORMAL=0;
var FLAG_PREMIUM=1;
var FLAG_PREMIUMPLUS=2;
			 
function onBodyLoad()
{	
    document.addEventListener("deviceready", onDeviceReady, false);
	document.getElementById("boton_salir").addEventListener("click", onOutKeyDown, false);	
	
	var boton_menu=document.getElementById("boton_menu");
	if(boton_menu!=null)
		boton_menu.addEventListener("click", onMenuKeyDown, false);	
	
	document.getElementById("cortina").addEventListener("click", function() {
		
		$('#menu_flotante').hide('drop');
		$('#cortina').hide();
		
	}, false);	
	
}
function onDeviceReady()
{
	document.addEventListener("offline", onOffline, false);
	document.addEventListener("online", onOnline, false);

	document.addEventListener("backbutton", onBackKeyDown, false);
	document.addEventListener("menubutton", onMenuKeyDown, false);
	
	if(device.platform!='android' && device.platform!='Android') 
	{
		$("#boton_salir").css("background", "url(./resources/images/general/atras.png) no-repeat center");
		document.getElementById("boton_salir").addEventListener("click", onBackKeyDown, false);	
	}
	
	/* *********************************************************************** */
	/* Comentar desde INICIO TEST NOTIFICACIONES hasta FIN TEST NOTIFICACIONES */
	/* para no realizar el registro del dispositivo	al inicio		 		   */
	/* *********************************************************************** */
	
	// INICIO TEST NOTIFICACIONES	
	var current_url=window.location.href;
	var opcion_notif=getLocalStorage("notificacion");
	var first_exec=getSessionStorage("first_time");
	if(current_url.indexOf("menu.html")!=-1)
	{
		if(typeof opcion_notif == "undefined" || opcion_notif==null || opcion_notif=="si")
		{
			if(typeof first_exec == "undefined" || first_exec==null)
			{
				setSessionStorage("first_time","yes");
				register_notif();
			}
		}
	}
	// FIN TEST NOTIFICACIONES	
	
	cordova.plugins.notification.local.on("click", function (notification, state) {
		 		 
		 var datos=$.parseJSON(notification.data);
 	 
		 var tipo=(notification.title).split(/\[(.*?)\]/);
		 switch(tipo[1])
		 {
			case "circular":window.location.href="circular.html?id="+datos.id;
							break;
							
			case "evento":  if(datos.premiumplus==true)
							{
								window.location.href="lecturas.html?id="+datos.id+"&fecha="+datos.fecha+"&tipo=dia";
							}
							else  //No deberían llegar notificaciones de evento en este caso, pero si llegan se envía al mes
							{
								window.location.href="lecturas.html?id="+datos.id+"&fecha="+datos.fecha+"&tipo=mes";
							}
							break;
		 }
		
	},this);	
	
					
	check_internet();
	 
}   

function register_notif()
{
	try 
	{ 		
		pushNotification = window.plugins.pushNotification;
		//$("body").append('<br>Registrando ' + device.platform);
		if (device.platform == 'android' || device.platform == 'Android' || device.platform == 'amazon-fireos' ) 
		{
			pushNotification.register(successHandler, errorHandler, {"senderID":senderID, "ecb":"onNotification"});			
		} 
		else
		{	
			pushNotification.register(tokenHandler, errorHandler, 
				{"badge":"true",
				"sound":"true",
				"alert":"true",
				"ecb":"onNotificationAPN"}
			);	
		}
	}
	catch(err) 
	{ 
		$("body").append("<br>Error registro notif: " + err.message); 
	} 
}
function unregister_notif()
{
	window.plugins.pushNotification.unregister(function() {
			//notificar al usuario con un mensaje
			window.sessionStorage.clear();
	});
}
function config_notifications(check) {
	
	switch(check)
	{
		default:
		case "si": 	$("#"+check).val("si");
					if(getLocalStorage("notificacion")!="si")
					{
						setLocalStorage("notificacion","si");
						register_notif();
					}
					break;
					
		case "no":  $("#"+check).val("no");
					if(getLocalStorage("notificacion")!="no")
					{
						setLocalStorage("notificacion","no");
						unregister_notif();
					}
					break;
	}
	 
}

// Notificacion para iOS
function onNotificationAPN(e) {
	if (e.alert) {
		 //$("body").append('<br>Notificaci&oacute;n: ' + e.alert);
		 // Alert (requiere plugin org.apache.cordova.dialogs)
		 navigator.notification.alert(e.alert);
	}
		
	if (e.sound) {
		// Sonido (requiere plugin org.apache.cordova.media)
		var snd = new Media(e.sound);
		snd.play();
	}
	
	if (e.badge) {
		pushNotification.setApplicationIconBadgeNumber(successHandler, e.badge);
	}
}
// GCM notificacion para Android
function onNotification(e) {

	switch( e.event )
	{
		case 'registered':
					if (e.regid.length > 0)
					{
						//$("body").append('<br>Registrado REGID:' + e.regid);
						registerOnServer(e.regid);
					}
					break;
		
		case 'message':
		
					var notif=e.payload;
		
					// Foreground: Notificación en línea, mientras estamos en la aplicación
					if (e.foreground)
					{
  
						// on Android soundname is outside the payload. 
						// On Amazon FireOS all custom attributes are contained within payload
						// var soundfile = e.soundname || e.payload.sound;
						// if the notification contains a soundname, play it.
						// playing a sound also requires the org.apache.cordova.media plugin
						// var my_media = new Media("/android_asset/www/"+ soundfile);
						// my_media.play();
						
						
						//OPCION 1: Mostramos un cuadro de diálogo
						
						/*
						$("#cortina").show(100, function() {
							$("#cortina").prepend('<div id="dialog-confirm" title="Nueva notificaci&oacute;n"><p>'+notif.tipo+" <br> "+notif.data.id+'</p></div>');
							$("#dialog-confirm").dialog({
								  resizable: false,
								  modal: true,
								  buttons: {
										"Ver": function() {
												$(this).dialog("close");
												$("#cortina").hide();
												 switch(notif.tipo)
												 {
													case "circular":window.location.href="circular.html?id="+notif.data.id;
																	break;
													case "evento":  if(notif.data.premiumplus==true)
																	{
																		window.location.href="lecturas.html?id="+notif.data.id+"&fecha="+notif.data.fecha+"&tipo=dia";
																	}
																	else
																	{
																		window.location.href="lecturas.html?id="+notif.data.id+"&fecha="+notif.data.fecha+"&tipo=mes";
																	}
																	break;
												 }
											
										},
										"Ignorar": function() {
											 $(this).dialog("close");
											 $("#cortina").hide();
										}
								  }
							});
						});
						*/
						
						
						//OPCIÓN 2: Generamos una notificación en la barra
						
						/*var date_notif=notif.date;
						if(date_notif!="" && date_notif!=null)
							date_notif=new Date();*/
						
						//if(notif.notId!="")
						//	id_notificacion=notif.notId;		
						
						window.plugin.notification.local.add({
							id:      id_notificacion,
							//date:    date_notif, 
							title:   "["+notif.tipo+"] "+notif.title,
							message: notif.message,
							data:	 notif.data,
							ongoing:    true,
							autoCancel: true
						});		

						id_notificacion++;						
											
					}
					else
					{	
						// e.coldstart: Usuario toca notificación en la barra de notificaciones
						// Coldstart y background: Enviamos a la página requerida
						switch(notif.tipo)
						{
							case "circular":window.location.href="circular.html?id="+notif.data.id;
											break;
							case "evento":  window.location.href="lecturas.html?id="+notif.data.id+"&fecha="+notif.data.fecha+"&tipo=dia";
											break;
						}
						
					}					
					break;
		
		case 'error':
					$("body").append('<br>Error:'+ e.msg);
					break;
		
		default:
					$("body").append('<br>Evento desconocido');
					break;
	}
}

function registerOnServer(registrationId) {

	var api_key=getLocalStorage("api-key");
	var mail=getLocalStorage("user_session");

    $.ajax({
        type: "POST",
        url: api_leco+"pushandroid/"+registrationId, 
		headers: {
				'Authorization': 'Basic ' + utf8_to_b64(mail+":"+api_key),
				'X-ApiKey':'d2a3771d-f2f3-4fc7-9f9f-8ad7697c81dc'
			},
		dataType: 'json',
		crossDomain: true, 
        success: function() {          	
					setSessionStorage("regID", registrationId);					
				},
        error: function(jqXHR) {
					if(jqXHR.status == 200) {
						//$("body").append('<br>Listo para notificaciones');	

						//notificar al usuario con un mensaje						
						setSessionStorage("regID", registrationId);
					}	
					if(jqXHR.status == 500) {
						$("body").append('<br>El dispositivo no se pudo registrar para recibir notificaciones.');
					}	
				}
		
    });
}
function tokenHandler (result) {
	//$("body").append('<br>Listo para notificaciones');
	registerOnServer(result);
}

function successHandler (result) {
	//$("body").append('Exito: '+result);
}

function errorHandler (error) {
	$("body").append('Error: '+error);
} 

function onBackKeyDown()
{
	if((window.location.href).indexOf("index.html")>-1 || (window.location.href).indexOf("menu.html")>-1) 
	{		
		navigator.app.exitApp();
		return false;
	}
	window.history.back();
}
function onMenuKeyDown()
{
	$('#menu_flotante').html(
				'<a href="menu.html">'+
					'<div class="button_float_nav">'+
						'<span class="icon_premium_menu_flot">I</span> Inicio'+
					'</div>'+
				'</a>'+
				'<a href="noticias.html?start=0&limit=5">'+
					'<div class="button_float_nav">'+
						'<img src="./resources/images/general/noticias.png" alt="noticias" width="20" /> Noticias'+
					'</div>'+
				'</a>'+
				'<a href="prensa.html">'+
					'<div class="button_float_nav">'+
						'<img src="./resources/images/general/prensa.png" alt="prensa" width="20" /> Prensa'+
					'</div>'+
				'</a>'+
				'<a href="guias.html">'+
					'<div class="button_float_nav">'+
						'<img src="./resources/images/general/guias.png" alt="contenidos" width="20" /> Contenidos'+
					'</div>'+
				'</a>'+
				'<a href="varios.html">'+
					'<div class="button_float_nav">'+
						'<img src="./resources/images/general/varios.png" alt="utilidades" width="20" /> Utilidades'+
					'</div>'+
				'</a>'+
				'<a href="circulares.html">'+
					'<div class="button_float_nav">'+
						'<img src="./resources/images/general/circular.png" alt="circulares" width="20" /> Circulares'+
					'</div>'+
				'</a>'+
				'<a href="consultas.html">'+
					'<div class="button_float_nav">'+
						'<img src="./resources/images/general/consultas.png" alt="consultas" width="20" /> Consultas'+
					'</div>'+
				'</a>'+				
				'<span id="premium_flot"> </span>'+
				'<script>'+
				'if(getLocalStorage("premium")==FLAG_PREMIUM || getLocalStorage("premium")==FLAG_PREMIUMPLUS) {'+
					'$("#premium_flot").html(\'<a href="instalaciones.html"><div class="button_float_nav">'+
					'<img src="./resources/images/general/panel_solar.png" alt="instalaciones" width="20" height="20" /> Instalaciones'+
					'</div></a>\'); }'+
				'</script>'+				
				'<a href="ajustes.html">'+
					'<div class="button_float_nav">'+
						'<img src="./resources/images/general/conf.png" alt="ajustes" width="20" /> Ajustes'+
					'</div>'+
				'</a>'+
				'<a href="#" onclick="close_session();">'+
					'<div class="button_float_nav">'+
						'<img src="./resources/images/general/llave.png" alt="salir" width="20" /> Cerrar sesi&oacute;n'+
					'</div>'+
				'</a>');
				
	$('#menu_flotante').toggle('drop'); 
	$('#cortina').toggle();
}

function onOutKeyDown()
{
	navigator.app.exitApp();
	return false;
}

function onOnline()
{
	online=true;
}
function onOffline()
{
	online=false;
}
function check_internet(){

	var isOffline = 'onLine' in navigator && !navigator.onLine;
	
	if(!isOffline) 
	{					
		online=true;		
	}
}

function close_session() {

	$("#cortina").prepend('<div id="dialog-confirm" title="Cerrar sesi&oacute;n"><p>Desea desconectarse?</p></div>');
	$('#cortina').show();
	$("#dialog-confirm").dialog({
	      resizable: false,
	      modal: true,
	      buttons: {
		        "OK": function() {
		          	$(this).dialog("close");
					$('#cortina').hide();
		          	
		          	setLocalStorage("user_session","");
					setLocalStorage("premium","");
					setLocalStorage("notificacion","");
					setLocalStorage("api-key","");
					setLocalStorage("Instalacion","");
					
					window.localStorage.clear();
					
					window.location.href='index.html';
					
		        },
		        "Cancelar": function() {
		         	 $(this).dialog("close");
					 $('#cortina').hide();
		        }
	      }
    });

}

function reset_passw() {

	$("#loading").show(function() 
	{		
		var mail=$("#user").val();
		
		if(mail=="")
		{
			$("#cortina").prepend('<div id="dialog-message" title="Recuperar contrase&ntilde;a"><p>Rellene el usuario</p></div>');
			$('#cortina').show();
			$("#dialog-message").dialog({
				  resizable: false,
				  modal: true,
				  buttons: {
						"OK": function() {	
							$(this).dialog("close");
							$('#cortina').hide();
						}
				  }
			});
		}
		else
		{
			$.ajax({
			  url: api_leco+"clave/"+mail+"/reset",
			  //url: api_leco+"clave/"+mail+"/reset/test/ok",
			  //url: api_leco+"clave/"+mail+"/reset/test/fallo",
			  headers: {
				'X-ApiKey':'d2a3771d-f2f3-4fc7-9f9f-8ad7697c81dc'
			  },
			  type: 'POST',
			  dataType: 'json',
			  crossDomain: true, 
			  success: function exito(respuesta) {
			  
							var mensaje=respuesta.mensaje;
							
							if(mensaje=="")
								mensaje+="Clave cambiada correctamente.";
								
							$("#cortina").prepend('<div id="dialog-message" title="Recuperar contrase&ntilde;a"><p>'+mensaje+'</p></div>');
							$('#cortina').show();
							$("#dialog-message").dialog({
								  resizable: false,
								  modal: true,
								  buttons: {
										"OK": function() {	
											$(this).dialog("close");
											$('#cortina').hide();
											
											window.location.href='index.html';
										}
								  }
							});
							
							setLocalStorage("user_session","");
							setLocalStorage("premium","");
							setLocalStorage("notificacion","");
							setLocalStorage("api-key","");
							setLocalStorage("Instalacion","");
							
							window.localStorage.clear();
							
					   },
			  error: function fallo(jqXHR, textStatus, errorThrown) {
			  
						var mensaje="No se pudo cambiar la contrase&ntilde;a.";
						
						if(jqXHR.status == 403) {
							mensaje="El usuario no tiene permisos o no existe."
						}
						
						if(jqXHR.status == 500) {
							mensaje="Error interno."
						}
						
						$("#cortina").prepend('<div id="dialog-message" title="Recuperar contrase&ntilde;a"><p>'+mensaje+'</p></div>');
						$('#cortina').show();
						$("#dialog-message").dialog({
							  resizable: false,
							  modal: true,
							  buttons: {
									"OK": function() {	
										$(this).dialog("close");
										$('#cortina').hide();
									}
							  }
						});
						return false;
					 },
			  async:false,
			});
		}
		
		$("#loading").hide();
		
	});

}

function change_passw(id_form) {
	$("#loading").show(function() 
	{		
		var pactual=$("#old_passw").val();
		var pnueva=$("#new_passw").val();
		
		if(pactual=="" || pnueva=="")
		{
			$("#cortina").prepend('<div id="dialog-message" title="Cambiar contrase&ntilde;a"><p>Rellene los dos campos</p></div>');
			$('#cortina').show();
			$("#dialog-message").dialog({
				  resizable: false,
				  modal: true,
				  buttons: {
						"OK": function() {	
							$(this).dialog("close");
							$('#cortina').hide();
						}
				  }
			});
		}
		else
		{
		
			var api_key=getLocalStorage("api-key");
			var mail=getLocalStorage("user_session");
		
			$.ajax({
			  url: api_leco+"clave/cambio/",	
			  //url: api_leco+"clave/cambio/test/fallo",				  
			  //url: api_leco+"clave/cambio/test/ok",	

			  data: { Actual: calcMD5(pactual), Nueva: calcMD5(pnueva) },
			  
			  headers: {
				'Authorization': 'Basic ' + utf8_to_b64(mail+':'+api_key),
				'X-ApiKey':'d2a3771d-f2f3-4fc7-9f9f-8ad7697c81dc'
			  },
			  type: 'PUT',
			  dataType: 'json',
			  crossDomain: true, 
			  success: function exito(respuesta) {
			  
							var mensaje=respuesta.mensaje;
							
							if(mensaje=="")
								mensaje+="Clave cambiada correctamente.";
							
							$("#cortina").prepend('<div id="dialog-message" title="Cambiar contrase&ntilde;a"><p>'+mensaje+'</p></div>');
							$('#cortina').show();
							$("#dialog-message").dialog({
								  resizable: false,
								  modal: true,
								  buttons: {
										"OK": function() {	
											$(this).dialog("close");
											$('#cortina').hide();
											window.location.href='menu.html';
										}
								  }
							});		

							if(respuesta.hasOwnProperty("token"))
							{
								setLocalStorage("api-key", respuesta.token);
							}							
							
							return;
	
					   },
			  error: function fallo(jqXHR, textStatus, errorThrown) {
			  
						var mensaje="No se pudo cambiar la contrase&ntilde;a.";
						
						if(jqXHR.status == 403) {
							mensaje+=" El usuario no tiene permisos o no existe."
						}
						
						if(jqXHR.status == 500) {
							mensaje+=" Error interno."
						}
						
						$("#cortina").prepend('<div id="dialog-message" title="Cambiar contrase&ntilde;a"><p>'+mensaje+'</p></div>');
						$('#cortina').show();
						$("#dialog-message").dialog({
							  resizable: false,
							  modal: true,
							  buttons: {
									"OK": function() {	
										$(this).dialog("close");
										$('#cortina').hide();
									}
							  }
						});
						return false;
					 },
			  async:false,
			});
		}
		
		$("#loading").hide();
		
	});
}

function start_user_session(id_form) {
		
	$("#loading").show(function() 
	{		
		var mail=$("#user").val();
		var passw=$("#passw").val();
		
		if(mail=="" || passw=="")
		{
			$("#cortina").prepend('<div id="dialog-message" title="Inicio de sesi&oacute;n"><p>Rellene los campos</p></div>');
			$('#cortina').show();
			$("#dialog-message").dialog({
				  resizable: false,
				  modal: true,
				  buttons: {
						"OK": function() {	
							$(this).dialog("close");
							$('#cortina').hide();
						}
				  }
			});
		}
		else
		{
		
			$.ajax({
			  url: api_leco+"login",
			  headers: {
				'X-ApiKey':'d2a3771d-f2f3-4fc7-9f9f-8ad7697c81dc'
			  },
			  data: { email: mail, clave: calcMD5(passw) },
			  type: 'GET',
			  dataType: 'json',
			  crossDomain: true, 
			  success: function exito(respuesta) {
			  
							setLocalStorage("api-key", respuesta.Token);
							setLocalStorage("user_session",mail);

							if(respuesta.Premium==true)
								setLocalStorage("premium", FLAG_PREMIUM);
							if(respuesta.PremiumPlus==true)
								setLocalStorage("premium", FLAG_PREMIUMPLUS);
							if(respuesta.Premium==false && respuesta.PremiumPlus==false)
								setLocalStorage("premium", FLAG_NORMAL);
								
							window.location.href='menu.html';
							
					   },
			  error: function fallo(jqXHR, textStatus, errorThrown) {
	
						$("#cortina").prepend('<div id="dialog-message" title="Inicio de sesi&oacute;n"><p>Datos incorrectos</p></div>');
						$('#cortina').show();
						$("#dialog-message").dialog({
							  resizable: false,
							  modal: true,
							  buttons: {
									"OK": function() {	
										$(this).dialog("close");
										$('#cortina').hide();
									}
							  }
						});
						return false;
					 },
			  async:false,
			});
		}
		
		$("#loading").hide();
		
	});
}

function send_query(id_form) {

	$("#loading").show(function() 
	{
		var values=$("#"+id_form).serialize();
		
		if($("#email").val()=="" || $("#tipo_consulta").val()=="" || $("#consulta").val()=="")
		{
			$("#campos_error_form").html("Por favor, revise los campos del formulario.");
			$("#loading").hide();
			return false;
		}
		else
		{
			var expr=/^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
			if(expr.test($("#email").val())==false)
			{
				$("#campos_error_form").html("Por favor, revise su email.");
				$("#loading").hide();
				return false;
			}
			else
			{
				$("#campos_error_form").html("<br>");
			}
		}
		
		setSessionStorage("mail_session", $("#email").val());
		
		var resultado=ajax_operation(values, "send_query");
		if(resultado)
		{
			$("#campos_error_form").html(resultado.result);
			$("#"+id_form).hide();
		}
		
		$("#loading").hide();
		
	});

}

function ajax_operation(values, operation) 
{
	
	var result=false;
				
	$.ajax({
	  type: 'POST',
	  url: api_url,
	  data: { v: values, o: operation },
	  success: h_proccess,
	  error:h_error,
	  dataType: "json",
	  async:false
	});			
	function h_proccess(data){
		if(data.status=="KO")
		{
			//alert(data.error); 
			$("#cortina").prepend('<div id="dialog-message" title="Error"><p>Datos incorrectos'+data.error+'</p></div>');
			$('#cortina').show();
			$("#dialog-message").dialog({
				  resizable: false,
				  modal: true,
				  buttons: {
						"OK": function() {	
							$(this).dialog("close");
							$('#cortina').hide();
						}
				  }
			});
		}
			
		if(data.status=="OK")
			result=data;	
			
		if(operation=="get_notifications")
		{
			id_notificacion++;
			show_notification(data.result);
		}
	}
	function h_error(jqXHR, textStatus, errorThrown)
	{
		//alert('Error: '+textStatus+" - "+errorThrown);	
		if(operation!="get_notifications")
		{
			$("#cortina").prepend('<div id="dialog-message" title="Error"><p>Datos incorrectos'+textStatus+" - "+errorThrown+'</p></div>');
			$('#cortina').show();
			$("#dialog-message").dialog({
				  resizable: false,
				  modal: true,
				  buttons: {
						"OK": function() {	
							$(this).dialog("close");
							$('#cortina').hide();
						}
				  }
			});
		}

		result=false;
	}					
	return result;
}

function ajax_recover_data(operation, values, container, isLocal) {

	if(isLocal==true || isLocal=="true")
	{						
		var objajax=$.getJSON(local_url+operation+values+".json", f_success)
		.fail(function(jqXHR, textStatus, errorThrown) {
			//alert('Error: "+textStatus+"  "+errorThrown);	
			$("#"+container).append("No se han cargado los datos del archivo.<br>Error: "+operation+values+" - "+textStatus+"  "+errorThrown);
		});
			
	}
	else 
	{
		$.ajax({
		  url: api_url,
		  data: { v: values, o: operation },
		  type: 'POST',
		  dataType: 'json',
		  crossDomain: true, 
		  success: f_success,
		  error: f_error,
		  async:false,
		});
	
	}

	function f_success(data) {

		if(data.length==0) {
			$("#"+container).html("No hay informaci&oacute;n.");
			return;
		}
		
		switch(operation)
		{
			case "news": 			
					var cadena="";

					$.each(data.result, function(index, d) {   

							var fecha=new Date(d.datetime*1000);
							var fecha_formateada=addZero(fecha.getDate())+"/"+addZero(fecha.getMonth()+1)+"/"+fecha.getFullYear();
							var imagen=d.image; 
							
							if(imagen!=null && imagen!="null" && imagen!="") 
							{						
								if(imagen.indexOf("http")<0)
								{
									cadena+="<div class='image_news' style='background:#FFF url("+extern_url+"uploads/pics/"+imagen+") no-repeat center;background-size:cover;'></div>";
								}
								else
									cadena+="<div class='image_news' style='background:#FFF url("+imagen+") no-repeat center;background-size:cover;'></div>";
														
							}
							else
							{
								cadena+="<div class='image_news' style='background:#FFF url(./resources/images/general/sin_imagen.jpg) no-repeat center;background-size:cover;'></div>";
							}
							
							cadena+="<div class='text_news'>";
							
							cadena+="<div class='fecha_01'>"+fecha_formateada+"</div>";

							cadena+="<h3>"+d.title+"</h3>";
							
							cadena+=d.short;
							
							cadena+="</div>";
							
							cadena+="<div class='clear_01'> </div>";
							
							if(isLocal)
								cadena+="<p><a class='vermas' href='noticia.html?id="+d.uid+"&local=true'>LEER M&Aacute;S</a></p>";
							else
								cadena+="<p><a class='vermas' href='noticia.html?id="+d.uid+"&local=false'>LEER M&Aacute;S</a></p>";
								

					});
					
					if(data.startPrev!=null)
						cadena+="<a class='verpagina' href='noticias.html?start="+data.startPrev+"&limit="+data.limit+"' style='float:left'><img src='./resources/images/general/arrow_left.png' alt='Anterior' width='10' style='vertical-align: bottom;margin-right: 5px;' />Anterior</a>";
					
					if(data.startNext!=null)
						cadena+="<a class='verpagina' href='noticias.html?start="+data.startNext+"&limit="+data.limit+"' style='float:right'>Siguiente<img src='./resources/images/general/arrow_right.png' alt='Siguiente' width='10' style='vertical-align: bottom;margin-left: 5px;' /></a>";
					
					$("#"+container).html(cadena);
									
					break;
				
			case "one_new": 		
		
					var cadena="";
				
					var d=data.result;
						
					var fecha=new Date(d.datetime*1000);
					var fecha_formateada=addZero(fecha.getDate())+"/"+addZero(fecha.getMonth()+1)+"/"+fecha.getFullYear();
					var imagen=d.image; 
					
					var url_web=extern_url+"comunicacion/noticias/post/titulo/"+data.url_web;
					
					var titulo=d.title;
					titulo=titulo.replace(/"/g, ""); 
					
					var url_imagen="";
					if(imagen!=null && imagen!="null" && imagen!="") 
					{						
						if(imagen.indexOf("http")<0)
						{	
							url_imagen=extern_url+"uploads/pics/"+imagen;
						}
						else
						{
							url_imagen=imagen;
						}
						
					}	
					
					cadena+="<h2>"+d.title+"</h2>";
					
					cadena+="<div class='fecha_02'>"+fecha_formateada;
					
					cadena+='<a class="vercompartir" id="compartir" onclick="window.plugins.socialsharing.share(\'Mensaje\', \''+titulo+'\', \''+url_imagen+'\', \''+url_web+'\')" href="#" ><img src="./resources/images/general/share_white.png" width="25" />Compartir</a>';
					
					cadena+="</div>";
					
					if(imagen!=null && imagen!="null" && imagen!="") 
					{						
						cadena+="<img src='"+url_imagen+"' alt='Imagen principal' />";
					}				
					
					cadena+=d.bodytext;

					$("#"+container).html(cadena);
					
					$("a").on("click", function(e) {
						var url = $(this).attr('href');
						var containsHttp = new RegExp('http\\b'); 
						
						if(containsHttp.test(url)) { 
							e.preventDefault(); 
							window.open(url, "_system", "location=yes"); // For iOS
							//navigator.app.loadUrl(url, {openExternal: true}); //For Android
						}
					});	
		
					break;
					
			case "tipos_circulares": 			
					var cadena="";

					if(data.status=="KO")
					{
						cadena+=data.error;
						$("#"+container).html(cadena);
					}
					else 
					{
						var opciones=new Array();
						cadena+='<h3>Filtrar circulares por tipo:</h3>';
						cadena+='<select id="select_circulares" class="select_01" name="CIRCULARES">';
						cadena+='<option onclick="$(\'#select_circulares\').val(\'\');ajax_recover_data(\'circulares\', \'\', \'contenido2\', false);" value="">VER TODAS LAS CIRCULARES</option>';
						$.each(data.result, function(index, d) {   
							var titulo=(d.title).replace(/CIRCULAR /,"");
							titulo=titulo.replace("(","");
							titulo=titulo.replace(")","");
							opciones[d.uid]=titulo;
							cadena+='<option value="'+d.uid+'">'+titulo+'</option>';
						});
						cadena+='</select>';
						
						cadena+='<div class="clear_02"> </div>';	
						
						$("#"+container).html(cadena);
						
						if(values!="")
							$('#select_circulares').val(values);
						
						$('#select_circulares').on('change',function(){
							//window.location.href='circulares.html?id='+$("#select_circulares").val();
							ajax_recover_data("circulares", $("#select_circulares").val(), "contenido2", false);
						});

						ajax_recover_data("circulares", values, "contenido2", false);
					}
				
									
					break;
					
			case "circulares": 			
			
					var cadena="";
										
					if(data.status=="KO")
					{
						cadena+=data.error;
					}
					else 
					{
						$.each(data.result, function(index, d) {   
						
							var fecha=new Date(d.date*1000);
							var fecha_formateada=addZero(fecha.getDate())+"/"+addZero(fecha.getMonth()+1)+"/"+fecha.getFullYear();

							cadena+="<div class='fecha_01'>"+fecha_formateada+"</div>";
								
							if(isLocal)
								cadena+="<a class='vercircular' href='circular.html?id="+d.uid+"&local=true'>"+d.header+"</a>";
							else
								cadena+="<a class='vercircular' href='circular.html?id="+d.uid+"&local=false'>"+d.header+"</a>";							
								
							cadena+="<div class='clear_01'> </div>";
									
						});
					}
					
					$("#"+container).html(cadena);
									
					break;
					
			case "one_circular": 		
			
					var cadena="";
			
					if(data.status=="KO")
					{
						cadena+=data.error;
					}
					else 
					{
						var fecha_formateada="";
						if(data.date!="")
						{
							var fecha=new Date(data.date*1000);
							fecha_formateada=addZero(fecha.getDate())+"/"+addZero(fecha.getMonth()+1)+"/"+fecha.getFullYear();
						}	
							
						cadena+="<h3>"+data.title+"</h3>";
						cadena+="<div class='fecha_01'>"+fecha_formateada+"</div>";
						
						console.log(data.result);
							
						$.each(data.result, function(index, d) {   
						
							if(d.text!="")
								cadena+=d.text;
							
							var imagen=d.image;
							var url_imagen="";
							if(imagen!=null && imagen!="null" && imagen!="") 
							{						
								if(imagen.indexOf("http")<0)
								{	
									url_imagen=extern_url+"uploads/pics/"+imagen;
									cadena+="<img src='"+url_imagen+"' alt='Imagen principal' />";
								}
								else
								{
									url_imagen=imagen;
									cadena+="<img src='"+url_imagen+"' alt='Imagen principal' />";
								}
								
							}	
							
							cadena+="<div class='clear_01'> </div>";
															
						});
					}
					
					$("#"+container).html(cadena);
									
					break;
				
					
			case "press": 		
		
					var cadena="";
			
					$.each(data.result, function(i, enlaces) {
						cadena+='<a class="verpdf" href="'+enlaces.url+'"><img src="./resources/images/general/doc.png" />'+enlaces.name+'</a><br>';
					});
								
					$("#"+container).html(cadena);
					
					$("a").on("click", function(e) {
						var url = $(this).attr('href');
						var containsHttp = new RegExp('http\\b'); 
						
						if(containsHttp.test(url)) { 
							e.preventDefault(); 
							window.open(url, "_system", "location=yes"); // For iOS
							//navigator.app.loadUrl(url, {openExternal: true}); //For Android
						}
					});	
					
					break;
					
			case "revista": 		
		
					var cadena="";
			
					if(data.status=="KO")
					{
						cadena+=data.error;
					}
					else 
					{

						$.each(data.result, function(index, d) {   
						
							cadena+="<h3>"+d.header+"</h3>";
							
							if(d.text!="")
							{								
								cadena+=d.bodytext;
							}
							var enlace=d.image_link;
							var imagen=d.image;
							var url_imagen="";
							var url_enlace="";
							
							if(enlace!=null && enlace!="null" && enlace!="") 
							{									
								if(enlace.indexOf("http")<0)
								{	
									url_enlace=extern_url+enlace;									
								}
								else
								{
									url_enlace=enlace;
								}
							}
								
							if(imagen!=null && imagen!="null" && imagen!="") 
							{						
								if(imagen.indexOf("http")<0)
								{	
									url_imagen=extern_url+"uploads/pics/"+imagen;									
								}
								else
								{
									url_imagen=imagen;
								}
								
								if(enlace!=null && enlace!="null" && enlace!="") 
								{									
									cadena+="<a href='"+url_enlace+"'><img src='"+url_imagen+"' alt='Imagen principal' style='width: 320px;display: inline-block;' /></a>";
								}
								else
								{								
									cadena+="<img src='"+url_imagen+"' alt='Imagen principal' style='width: 300px;display: inline-block;' />";
								}
								
							}	
							else
							{
								if(url_enlace!="")
									cadena+="<a href='"+url_enlace+"'>"+url_enlace+"</a>";
							}
														
							cadena+="<div class='clear_03'> </div>";
															
						});
						
						if(data.startPrev!=null)
							cadena+="<a class='verpagina' href='revista.html?start="+data.startPrev+"&limit="+data.limit+"' style='float:left'><img src='./resources/images/general/arrow_left.png' alt='Anterior' width='10' style='vertical-align: bottom;margin-right: 5px;' />Anterior</a>";
						
						if(data.startNext!=null)
							cadena+="<a class='verpagina' href='revista.html?start="+data.startNext+"&limit="+data.limit+"' style='float:right'>Siguiente<img src='./resources/images/general/arrow_right.png' alt='Siguiente' width='10' style='vertical-align: bottom;margin-left: 5px;' /></a>";
					
					}
					
					$("#"+container).html(cadena);
					
					break;
					
			
			case "info_sectorial":	
			
					var cadena="";
					
					if(data.status=="KO")
					{
						cadena+=data.error;
					}
					else 
					{
						$.each(data.result, function(index, d) {   

							if(isLocal)
								cadena+="<a class='verpdf' href='contenido.html?id="+d.uid+"&tipo=sectorial&local=true'>"+d.title+"</a>";
							else
								cadena+="<a class='verpdf' href='contenido.html?id="+d.uid+"&tipo=sectorial&local=false'>"+d.title+"</a>";
								
							cadena+="<div class='clear_02'> </div>";					
													
						});
					}
					
					$("#"+container).html(cadena);
									
					break;
					
			case "audiovisual":	
			
					var cadena="";
					
					if(data.status=="KO")
					{
						cadena+=data.error;
					}
					else 
					{
						$.each(data.result, function(index, d) {   

							if(isLocal)
								cadena+="<a class='verpdf' href='contenido.html?id="+d.uid+"&tipo=contenido&local=true'>"+d.title+"</a>";
							else
								cadena+="<a class='verpdf' href='contenido.html?id="+d.uid+"&tipo=contenido&local=false'>"+d.title+"</a>";
								
							cadena+="<div class='clear_01'> </div>";
									
						});
						
						if(data.startPrev!=null)
							cadena+="<a class='verpagina' href='contenidos.html?tipo=audiovisual&start="+data.startPrev+"&limit="+data.limit+"' style='float:left'><img src='./resources/images/general/arrow_left.png' alt='Anterior' width='10' style='vertical-align: bottom;margin-right: 5px;' />Anterior</a>";
						
						if(data.startNext!=null)
							cadena+="<a class='verpagina' href='contenidos.html?tipo=audiovisual&start="+data.startNext+"&limit="+data.limit+"' style='float:right'>Siguiente<img src='./resources/images/general/arrow_right.png' alt='Siguiente' width='10' style='vertical-align: bottom;margin-left: 5px;' /></a>";
						}
					
					$("#"+container).html(cadena);
									
					break;
					
			case "otros_contenidos":	
					var cadena="";
			
					if(data.status=="KO")
					{
						cadena+=data.error;
					}
					else 
					{

						$.each(data.result, function(index, d) {   
						
							cadena+="<h3>"+d.header+"</h3>";
							
							if(d.text!="")
							{								
								cadena+=d.bodytext;
							}
							var enlace=d.image_link;
							var imagen=d.image;
							var url_imagen="";
							var url_enlace="";
							
							if(enlace!=null && enlace!="null" && enlace!="") 
							{									
								if(enlace.indexOf("http")<0)
								{	
									url_enlace=extern_url+enlace;									
								}
								else
								{
									url_enlace=enlace;
								}
							}
								
							if(imagen!=null && imagen!="null" && imagen!="") 
							{						
								if(imagen.indexOf("http")<0)
								{	
									url_imagen=extern_url+"uploads/pics/"+imagen;									
								}
								else
								{
									url_imagen=imagen;
								}
								
								if(enlace!=null && enlace!="null" && enlace!="") 
								{									
									cadena+="<a href='"+url_enlace+"'><img src='"+url_imagen+"' alt='Imagen principal' style='width: 320px;display: inline-block;' /></a>";
								}
								else
								{								
									cadena+="<img src='"+url_imagen+"' alt='Imagen principal' style='width: 320px;display: inline-block;' />";
								}
								
							}	
							else
							{
								if(url_enlace!="")
									cadena+="<a href='"+url_enlace+"'>"+url_enlace+"</a>";
							}
														
							cadena+="<div class='clear_02'> </div>";
															
						});
						
						cadena+="<div class='clear_02'> </div>";
						
						if(data.startPrev!=null)
							cadena+="<a class='verpagina' href='contenidos.html?tipo=otros_contenidos&start="+data.startPrev+"&limit="+data.limit+"' style='float:left'><img src='./resources/images/general/arrow_left.png' alt='Anterior' width='10' style='vertical-align: bottom;margin-right: 5px;' />Anterior</a>";
						
						if(data.startNext!=null)
							cadena+="<a class='verpagina' href='contenidos.html?tipo=otros_contenidos&start="+data.startNext+"&limit="+data.limit+"' style='float:right'>Siguiente<img src='./resources/images/general/arrow_right.png' alt='Siguiente' width='10' style='vertical-align: bottom;margin-left: 5px;' /></a>";
					
					}
					
					$("#"+container).html(cadena);
									
					break;
					
			case "contenidos": 	break;
			
			case "sectorial":
								var cadena="";
					
								if(data.status=="KO")
								{
									cadena+=data.error;
								}
								else 
								{
									$.each(data.result, function(index, d) {   
			
										cadena+="<h2>"+d.title+"</h2>";
										
										var imagen=d.image;
										var url_imagen="";
										if(imagen!=null && imagen!="null" && imagen!="") 
										{						
											if(imagen.indexOf("http")<0)
											{	
												url_imagen=extern_url+"uploads/pics/"+imagen;
												cadena+="<img src='"+url_imagen+"' alt='Imagen principal' />";
											}
											else
											{
												url_imagen=imagen;
												cadena+="<img src='"+url_imagen+"' alt='Imagen principal' />";
											}
											
										}	
										cadena+=d.text;			
											
										cadena+="<div class='clear_02'> </div>";										
															
									});									
								}
					
								$("#"+container).html(cadena);
									
								break;
					
			case "contenido": 	
			
					var cadena="";
					
					if(data.status=="KO")
					{
						cadena+=data.error;
					}
					else 
					{
						$.each(data.result, function(index, d) {   

							cadena+="<h2>"+d.title+"</h2>";
							
							var imagen=d.image;
							var url_imagen="";
							if(imagen!=null && imagen!="null" && imagen!="") 
							{						
								if(imagen.indexOf("http")<0)
								{	
									url_imagen=extern_url+"uploads/pics/"+imagen;
									cadena+="<img src='"+url_imagen+"' alt='Imagen principal' />";
								}
								else
								{
									url_imagen=imagen;
									cadena+="<img src='"+url_imagen+"' alt='Imagen principal' />";
								}
								
							}	
							cadena+=d.text;			
								
							cadena+="<div class='clear_02'> </div>";
							
							if(d.related!="")
							{
								cadena+="<div class='mostrar_ocultar' onclick='$(\"#relacionados\").toggle();$(this).hide()'>MOSTRAR M&Aacute;S</div>";
								cadena+="<div class='clear_02'> </div>";
								cadena+="<div id='relacionados' style='display:none'>";
								var relacionados=d.related;
								for(indice=0;indice<relacionados.length;indice++)
								{
									$.each(relacionados[indice], function(index, rel) {   
	
										cadena+="<h2>"+rel.title+"</h2>";
									
										var imagen=rel.image;
										var url_imagen="";
										if(imagen!=null && imagen!="null" && imagen!="") 
										{						
											if(imagen.indexOf("http")<0)
											{	
												url_imagen=extern_url+"uploads/pics/"+imagen;
												cadena+="<img src='"+url_imagen+"' alt='Imagen principal' />";
											}
											else
											{
												url_imagen=imagen;
												cadena+="<img src='"+url_imagen+"' alt='Imagen principal' />";
											}
											
										}	
										cadena+=rel.text;			
											
										cadena+="<div class='clear_02'> </div>";	
									});
	
								}
								cadena+="</div>";
							}
												
						});
						
					}
					
					$("#"+container).html(cadena);

					break;					
					
		}
		
		$("a").on("click", function(e) {
			var url = $(this).attr('href');
			var containsHttp = new RegExp('http\\b'); 

			if(containsHttp.test(url)) { 
				e.preventDefault(); 
				window.open(url, "_system", "location=yes"); // For iOS
				//navigator.app.loadUrl(url, {openExternal: true}); //For Android
			}
		});	
	
	}
	function f_error(jqXHR, textStatus, errorThrown){
		//alert('Error: '+textStatus+" - "+errorThrown);	
		if(jqXHR.status == 404) {
			$("#"+container).html("No hay informaci&oacute;n");
		}
		else
		{
			$("#"+container).html("Necesita tener conexi&oacute;n a internet para acceder a esta secci&oacute;n.");
		}
	}
		 
}

function utf8_to_b64(cadena) {
	return window.btoa(unescape(encodeURIComponent(cadena)));
}

function b64_to_utf8(cadena) {
	return decodeURIComponent(escape(window.atob(cadena)));
}

function check_instalation(result) {

	var instalaciones=JSON.parse(getLocalStorage("Instalacion"));

	mantenedor_instalacion[result.ID]=
		{
			idM:result.IDMantenedor,
			nombreM:"",
			logoM:"",
			potenciaI:result.Potencia,
			premium:result.Premium,
			premiumplus:result.PremiumPlus
		};
		
	setLocalStorage("Instalacion", JSON.stringify(mantenedor_instalacion));
					
	$.ajax({
	  url: api_leco+"mantenedor/"+result.IDMantenedor,
	   headers: {
		'Authorization': 'Basic ' + utf8_to_b64(getLocalStorage("user_session")+":"+getLocalStorage("api-key")),
		'X-ApiKey':'d2a3771d-f2f3-4fc7-9f9f-8ad7697c81dc'
	  },
	  type: 'GET',
	  dataType: 'json',
	  crossDomain: true, 
	  success:  function exito(result2) 
				{
					mantenedor_instalacion[result.ID]={idM:result.IDMantenedor,nombreM:result2.Nombre,logoM:result2.Logo,nombreI:result.Nombre,potenciaI:result.Potencia,premium:result.Premium,premiumplus:result.PremiumPlus};
					setLocalStorage("Instalacion", JSON.stringify(mantenedor_instalacion));								
				},
	  error: function error() {},
	  async:false,
	});	
}

function ajax_recover_leco(operation, values, container, type) {

	var api_key=getLocalStorage("api-key");
	var mail=getLocalStorage("user_session");
	
	$.ajax({
	  url: api_leco+operation+values,
	  headers: {
			'Authorization': 'Basic ' + utf8_to_b64(mail+":"+api_key),
			'X-ApiKey':'d2a3771d-f2f3-4fc7-9f9f-8ad7697c81dc'
	  },
	  type: 'GET',
	  dataType: 'json',
	  crossDomain: true, 
	  success: f_success,
	  error: f_error,
	  async:false,
	});	

	function f_success(data, textStatus, jqXHR) {
	
		if(jqXHR.status == 204) {
			$("#"+container).html("Su instalaci&oacute;n no tiene los datos necesarios para realizar la estimaci&oacute;n de retribuci&oacute;n.");
			return;
		}
		
		if(jqXHR.status == 404) {
			$("#"+container).html("La instalaci&oacute;n no existe.");
			return;
		}

		switch(operation)
		{
			case "instalacion": 

					var cadena="";
					$("#"+container).html("");
					
					var numero_instalaciones=data.length;					
										
					cadena+="<h2 style='text-align: center;'><span style='font-size:3em'>"+numero_instalaciones+"</span><img src='./resources/images/general/panel_solar.png' style='margin: 0; display: inline; width: 60px; margin-left: 15px;' /><br>INSTALACIONES</h2>";												
					$("#"+container).append(cadena);

					$.each(data, function(index, result) {  
						
						var ultima_fecha=result.UltimaFecha;	
						var fecha_solo=ultima_fecha.toString().split("T");
						var fecha_split=fecha_solo[0].split("-");

						var dia_ult_fecha=parseInt(fecha_split[2]);
						var mes_ult_fecha=parseInt(fecha_split[1]);
						var anio_ult_fecha=parseInt(fecha_split[0]);			
																	
						check_instalation(result);
						
						var fecha_formateada=addZero(dia_ult_fecha)+"/"+addZero(mes_ult_fecha)+"/"+anio_ult_fecha;
						var fecha_formateada2=monthNames[mes_ult_fecha-1]+" "+anio_ult_fecha;		
						
						cadena="<div class='instalaciones'><h3>"+result.Nombre+"</h3>";
						
						if(result.Premium==true)
						{
							cadena+="<span onclick='window.location.href=\"lecturas.html?id="+result.ID+"&fecha="+anio_ult_fecha+"-"+addZero(mes_ult_fecha)+"-"+addZero(dia_ult_fecha)+"&tipo=mes\"'><div class='contenedor_datos_instalacion' ><div class='fecha_01'>"+fecha_formateada2+"</div><div class='energia_02'>"+result.UltimoDato+" kWh</div></div>";
						}
						if(result.PremiumPlus==true)
						{
							cadena+="<span onclick='window.location.href=\"lecturas.html?id="+result.ID+"&fecha="+anio_ult_fecha+"-"+addZero(mes_ult_fecha)+"-"+addZero(dia_ult_fecha)+"&tipo=mes\"'><div class='contenedor_datos_instalacion' ><div class='fecha_01'>"+fecha_formateada+"</div><div class='energia_02'>"+result.UltimoDato+" kWh</div></div>";
						}
							
						if(result.Datos!=null)
						{						
							var array_label_dias=new Array();
							for(i=0;i<result.Datos.Valores.length;i++)
								array_label_dias[i]=i+1;
							
							var datos = {
								labels: array_label_dias, 
								datasets: [
									{
										fillColor: "rgba(189,133,161,1)", 
										strokeColor: "rgba(129,16,72,1)",
										pointColor: "rgba(129,16,72,1)",
										pointStrokeColor: "#fff",
										pointHighlightFill: "#fff",
										pointHighlightStroke: "rgba(129,16,72,1)",
										data: result.Datos.Valores
									}
								]
							};
							
							cadena+='<div class="contenedor_canvas_instalacion"><canvas id="grafica_'+index+'" width="100" height="75" style=" max-width: 100%;  width: 100px; height: 75px;margin:auto"></canvas></div></span>';
						}
						else
						{
							cadena+='<div class="contenedor_canvas_instalacion" style="height:80px"></div>';
						}
						
						cadena+="<div class='verretribucion' onclick='window.location.href=\"retribucion.html?id="+result.ID+"&fecha="+anio_ult_fecha+"-"+addZero(mes_ult_fecha)+"-"+addZero(dia_ult_fecha)+"&tipo=mes\"'><img src='./resources/images/general/euro_menu.png' width='50' /></div>";
						
						
						cadena+="<div class='clear_01'> </div>";
						
						cadena+="</div>";
						
						$("#"+container).append(cadena);
						
						if(result.Datos!=null)
						{
							// Gráfica
							var ctx = document.getElementById("grafica_"+index).getContext("2d");
							
							//if(getLocalStorage("premium")==FLAG_PREMIUM)
							if(result.Premium==true)
							{
								var myGrafica = new Chart(ctx).Bar(datos, {
													showScale: false,
													showTooltips: false,
													barShowStroke : false,
													barStrokeWidth : 0,
													barValueSpacing : -1,
													//scaleStartValue: result.Datos.Inicio,
													pointDot: false
												});
							}
							//if(getLocalStorage("premium")==FLAG_PREMIUMPLUS)
							if(result.PremiumPlus==true)
							{
								var myGrafica = new Chart(ctx).Line(datos, {
													showScale: false,
													showTooltips: false,
													//scaleStartValue: result.Datos.Inicio,
													pointDot: false
												});
							}
							if(result.Premium==false && result.PremiumPlus==false)
							{
							
							}
						}

					});
													
					break;
					
			case "retribucion":
			
					if(data.length==0) {
						$("#"+container).html("No hay informaci&oacute;n.");
						return;
					}

					var cadena="";
					
					var array_horas=new Array();
					var array_lecturas=new Array();
					
					var valores=values.split("/");
					
					var id_instalacion=valores[1];

					var fecha_calendario=valores[2].split("-");
					
					var importeRinv=parseFloat(data.ImporteRinv).toFixed(2);
					var importeRo=parseFloat(data.ImporteRo).toFixed(2);
					var importeRm=parseFloat(data.ImporteRm).toFixed(2);
					
					var importeTotalSuma=parseFloat(importeRinv)+parseFloat(importeRo)+parseFloat(importeRm);
					importeTotalSuma=importeTotalSuma.toFixed(2);
					
					cadena+="<div class='datos_retribucion_04'><span><img src='./resources/images/general/info.png' class='img_info' /> Datos en base a una facturaci&oacute;n ideal (sin tener en cuenta coeficiente de cobertura ni reliquidaciones)</span></div>";
						
					cadena+="<div style='text-align:center'>";
					
					cadena+='<select class="select_02" id="mes_retribucion" name="MES" >';
					for(i=0;i<monthNames.length;i++)
					{
						if(fecha_calendario[1]==addZero(i+1))
							cadena+="<option value='"+addZero(i+1)+"' selected>"+monthNames[i]+"</option>";
						else
							cadena+="<option value='"+addZero(i+1)+"'>"+monthNames[i]+"</option>";
					}
					cadena+="</select>";
					
					cadena+="<select class='select_02' id='anio_retribucion' name='A&Nacute;O' >";
					for(j=2014;j<=new Date().getFullYear();j++)
					{
						if(fecha_calendario[0]==j)
							cadena+="<option value='"+j+"' selected>"+j+"</option>";
						else
							cadena+="<option value='"+j+"'>"+j+"</option>";
					}
					cadena+="</select>";
					
					cadena+="<input type='button' class='input_01' value='VER ACUMULADO A&Ntilde;O' onclick='window.location.href=\"retribucionanual.html?id="+id+"&fecha="+valores[2]+"\"' />";					
					
					cadena+="</div>";
					
					cadena+="<div class='clear_03'> </div>";
					
					if(data.Perdidas!=null && data.Perdidas>0)
					{
						cadena+="<div class='datos_retribucion_01'>PRODUCCI&Oacute;N <span>"+data.EnergiaMWh+" MWh<br>"+
								"<span class='datos_retribucion_06'>(Aplicadas p&eacute;rdidas de transformaci&oacute;n)</span></span></div>";
					}
					else
					{
						cadena+="<div class='datos_retribucion_01'>PRODUCCI&Oacute;N <span>"+data.EnergiaMWh+" MWh</span></div>";
					}
							
					cadena+="<div class='datos_retribucion_02'>Rinv<br><span class='rinv'>"+importeRinv+" &euro;</span></div>"+
							"<div class='datos_retribucion_02'>Ro<br><span class='ro'>"+importeRo+" &euro;</span></div>"+
							"<div class='datos_retribucion_02'>Rm<br><span class='rm'>"+importeRm+" &euro;</span></div>";	
							
					cadena+="<div class='clear_03'> </div>";
					
					cadena+="<div class='datos_retribucion_04'>Retribuci&oacute;n mensual total a percibir<span>"+importeTotalSuma+" &euro;</span></div>";
							
					cadena+="<div class='clear_03'> </div>";
							
					cadena+='<canvas id="grafica_tarta" width="260" height="260" style="margin:auto;max-width:100%" ></canvas>';
					
					cadena+="<div class='clear_03'> </div>";
					
					cadena+="<div class='datos_retribucion_03'>Horas max.<br><span>"+data.HorasMaximas+"</span></div>"+
							"<div class='datos_retribucion_03'>Horas prod.<br><span>"+data.HorasAcumuladas+"</span></div>";
							
					cadena+="<div class='clear_03'> </div>";
					
					if(data.CoeficienteCobertura!=null)
						cadena+="<div class='datos_retribucion_03'>Coeficiente<br>cobertura <span>"+data.CoeficienteCobertura+" %</span></div>";
					else
						cadena+="<div class='datos_retribucion_03'>Coeficiente<br>cobertura <span>No aplicado</span></div>";
					
					if(data.Perdidas!=null)
						cadena+="<div class='datos_retribucion_03'><br>P&eacute;rdidas <span>"+data.Perdidas+" %</span></div>";
					else
						cadena+="<div class='datos_retribucion_03'><br>P&eacute;rdidas <span>No hay informe</span></div>";
							
					cadena+="<div class='clear_03'> </div>";
					
					cadena+="<div class='datos_retribucion_04'>Precio medio de las horas de producci&oacute;n <span>"+parseFloat(data.MediaPrecioMercadoMWh).toFixed(2)+" &euro;/MWh</span></div>";
					
					cadena+="<div class='datos_retribucion_04'>Valor fijo Rinv <span>"+parseFloat(data.Rinv).toFixed(2)+"</span></div>"+
							"<div class='datos_retribucion_04'>Valor fijo Ro <span>"+parseFloat(data.Ro).toFixed(2)+"</span></div>";

					cadena+="<div class='clear_02'> </div>";								
							
					cadena+="<div class='datos_retribucion_05'>"+
							"<b>*Rinv:</b> Retribuci&oacute;n a la inversi&oacute;n<br>"+
							"<b>*Ro:</b> Retribuci&oacute;n a la operaci&oacute;n<br>"+	
							"<b>*Rm:</b> Retribuci&oacute;n de mercado</div>";	

					
					var datos = 
						[
							{
								value: data.ImporteRinv,
								color:"#811048",
								highlight: "#97265F",
								label: "Rinv"
							},
							{
								value: data.ImporteRo,
								color: "#1DA9A9",
								highlight: "#3CBEBE",
								label: "Ro"
							},
							{
								value: data.ImporteRm,
								color: "#F9AD05",
								highlight: "#FFC23E",
								label: "Rm"
							}								
						];

					$("#"+container).html(cadena);
					
					$("#mes_retribucion").val(addZero(parseInt(fecha_calendario[1])));
					$("#anio_retribucion").val(fecha_calendario[0]);
										
					$('select#mes_retribucion').on('change',function(){
						window.location.href='retribucion.html?id='+id_instalacion+'&fecha='+$("#anio_retribucion").val()+'-'+$("#mes_retribucion").val()+'-01';
						
					});
					
					$('select#anio_retribucion').on('change',function(){
						window.location.href='retribucion.html?id='+id_instalacion+'&fecha='+$("#anio_retribucion").val()+'-'+$("#mes_retribucion").val()+'-01';
						
					});
					
					var width_canvas=$(".section_01").width(); 
					$("#grafica_tarta").attr("width",width_canvas);
					
					// Gráfica
					var ctx = document.getElementById("grafica_tarta").getContext("2d");
					var myGrafica = new Chart(ctx).Pie(datos, {
										responsive: true,
										segmentStrokeWidth : 0,
										animationSteps : 60,
										tooltipTemplate: "<%=label%>: <%= value.toFixed(2) %>",
										animationEasing : "linear",
									});
									
						
					break;
					
			case "retribucionanual": 
			
					if(data.length==0) {
						$("#"+container).html("No hay informaci&oacute;n.");
						return;
					}
					
					var cadena="";
					
					var array_horas=new Array();
					var array_lecturas=new Array();
					
					var valores=values.split("/");
					
					var id_instalacion=valores[1];

					var fecha_calendario=valores[2].split(",");
					
					var importeRinv=parseFloat(data.ImporteRinv).toFixed(2);
					var importeRo=parseFloat(data.ImporteRo).toFixed(2);
					var importeRm=parseFloat(data.ImporteRm).toFixed(2);
					
					var importeTotalSuma=parseFloat(importeRinv)+parseFloat(importeRo)+parseFloat(importeRm);
					importeTotalSuma=importeTotalSuma.toFixed(2);
					
					cadena+="<div class='datos_retribucion_04'><span><img src='./resources/images/general/info.png' class='img_info' /> Datos en base a una facturaci&oacute;n ideal (sin tener en cuenta coeficiente de cobertura ni reliquidaciones)</span></div>";
					
					cadena+="<div style='text-align:center'><h2>A&Ntilde;O "+fecha_calendario[0]+"</div>";
					
					cadena+="<div class='clear_03'> </div>";
					
					if(data.Perdidas!=null && data.Perdidas>0)
					{
						cadena+="<div class='datos_retribucion_01'>PRODUCCI&Oacute;N <span>"+data.EnergiaMWh+" MWh<br>"+
								"<span class='datos_retribucion_06'>(Aplicadas p&eacute;rdidas de transformaci&oacute;n)</span></span></div>";
					}
					else
					{
						cadena+="<div class='datos_retribucion_01'>PRODUCCI&Oacute;N <span>"+data.EnergiaMWh+" MWh</span></div>";
					}
						
					cadena+="<div class='datos_retribucion_02'>Rinv<br><span class='rinv'>"+importeRinv+" &euro;</span></div>"+
							"<div class='datos_retribucion_02'>Ro<br><span class='ro'>"+importeRo+" &euro;</span></div>"+
							"<div class='datos_retribucion_02'>Rm<br><span class='rm'>"+importeRm+" &euro;</span></div>";	
							
					cadena+="<div class='clear_03'> </div>";
					
					cadena+="<div class='datos_retribucion_04'>Retribuci&oacute;n anual total a percibir<span>"+importeTotalSuma+" &euro;</span></div>";
							
					cadena+="<div class='clear_03'> </div>";
							
					cadena+='<canvas id="grafica_tarta" width="260" height="260" style="margin:auto;max-width:100%" ></canvas>';
					
					cadena+="<div class='clear_03'> </div>";
					
					cadena+="<div class='datos_retribucion_03'>Horas max.<br><span>"+data.HorasMaximas+"</span></div>"+
							"<div class='datos_retribucion_03'>Horas prod.<br><span>"+data.HorasAcumuladas+"</span></div>";
							
					cadena+="<div class='clear_03'> </div>";
					
					if(data.CoeficienteCobertura!=null)
						cadena+="<div class='datos_retribucion_03'>Coeficiente<br>cobertura <span>"+data.CoeficienteCobertura+" %</span></div>";
					else
						cadena+="<div class='datos_retribucion_03'>Coeficiente<br>cobertura <span>No aplicado</span></div>";
					
					if(data.Perdidas!=null)
						cadena+="<div class='datos_retribucion_03'><br>P&eacute;rdidas <span>"+data.Perdidas+" %</span></div>";
					else
						cadena+="<div class='datos_retribucion_03'><br>P&eacute;rdidas <span>No hay informe</span></div>";
							
					cadena+="<div class='clear_03'> </div>";
					
					cadena+="<div class='datos_retribucion_04'>Precio medio de las horas de producci&oacute;n <span>"+parseFloat(data.MediaPrecioMercadoMWh).toFixed(2)+" &euro;/MWh</span></div>";
					
					cadena+="<div class='datos_retribucion_04'>Valor fijo Rinv <span>"+parseFloat(data.Rinv).toFixed(2)+"</span></div>"+
							"<div class='datos_retribucion_04'>Valor fijo Ro <span>"+parseFloat(data.Ro).toFixed(2)+"</span></div>";

					cadena+="<div class='clear_02'> </div>";								
							
					cadena+="<div class='datos_retribucion_05'>"+
							"<b>*Rinv:</b> Retribuci&oacute;n a la inversi&oacute;n<br>"+
							"<b>*Ro:</b> Retribuci&oacute;n a la operaci&oacute;n<br>"+	
							"<b>*Rm:</b> Retribuci&oacute;n de mercado</div>";	

					
					var datos = 
						[
							{
								value: data.ImporteRinv,
								color:"#811048",
								highlight: "#97265F",
								label: "Rinv"
							},
							{
								value: data.ImporteRo,
								color: "#1DA9A9",
								highlight: "#3CBEBE",
								label: "Ro"
							},
							{
								value: data.ImporteRm,
								color: "#F9AD05",
								highlight: "#FFC23E",
								label: "Rm"
							}								
						];

					$("#"+container).html(cadena);
										
					var width_canvas=$(".section_01").width(); 
					$("#grafica_tarta").attr("width",width_canvas);
					
					// Gráfica
					var ctx = document.getElementById("grafica_tarta").getContext("2d");
					var myGrafica = new Chart(ctx).Pie(datos, {
										responsive: true,
										segmentStrokeWidth : 0,
										animationSteps : 60,
										animationEasing : "linear",
									});
									
						
					break;
					
			case "lecturas": 	
					
					var valores=values.split("/");
					var id_instalacion=valores[1].split("-");
					var fecha_calendario=valores[3].split("-");
					
					var mantenedores=JSON.parse(getLocalStorage("Instalacion"));
					
					if(type=="mes")
					{
						var cadena="";

						var array_fechas=new Array();
						var array_lecturas=new Array();						
						var array_calendario=new Array();
						var array_eventos=new Array();
						var total_energia_mes=0;
						
						var potencia_instalacion=0;
						
						if(mantenedores!=null)
						{
							if(mantenedores[id_instalacion]!=null)
							{
								potencia_instalacion=mantenedores[id_instalacion].potenciaI;
								if(mantenedores[id_instalacion].logoM!="")
									cadena+="<img src='data:image/png;base64,"+mantenedores[id_instalacion].logoM+"' class='img_mantenedor' />";
							}
						}
						
						cadena+="<h2 style='word-wrap: break-word;'>"+mantenedores[id_instalacion].nombreI+"</h2>";
						
						cadena+='<div class="clear_01"> </div>';
						
						cadena+='<canvas id="grafica_mensual" width="250" height="170" style="max-width:100%; max-height: 250px;" ></canvas>';
						
						cadena+="<div id='total_energia_mes' class='total_energia'> </div>";
						
						cadena+="<div style='position:relative'>";
						
						cadena+="<div class='contenedor_flechas'>"+
								"<a href='lecturas.html?id="+id_instalacion+"&fecha="+fecha_calendario[0]+"-"+addZero(parseInt(fecha_calendario[1])-1)+"-"+addZero(parseInt(fecha_calendario[2]))+"&tipo=mes' style='float:left'><img src='./resources/images/general/arrow_left.png' alt='Anterior' width='18' /></a>"+
								"<a href='lecturas.html?id="+id_instalacion+"&fecha="+fecha_calendario[0]+"-"+addZero(parseInt(fecha_calendario[1])+1)+"-"+addZero(parseInt(fecha_calendario[2]))+"&tipo=mes' style='float:right'><img src='./resources/images/general/arrow_right.png' alt='Siguiente' width='18' /></a><div class='clear_01'> </div></div>";
						
						cadena+='<div class="clear_01"> </div>';
						
						cadena+='<div id="calendario"></div>';
						
						cadena+="</div>";
						
						if(data.length==0) {
							cadena+="No hay informaci&oacute;n.";
						}
						else
						{			
							
							$.each(data, function(index, result) {  
							
								var fecha=result.Fecha;	
								
								var fecha_solo=fecha.toString().split("T");
								var fecha_split=fecha_solo[0].split("-");
							
								var dia=parseInt(fecha_split[2]);
								var mes=parseInt(fecha_split[1]);
								var anio=parseInt(fecha_split[0]);			
								
								var fecha_formateada=addZero(dia)+"-"+addZero(mes)+"-"+anio;
								
								array_fechas[index]=addZero(dia);
								array_lecturas[index]=result.Energia;
								array_eventos[(dia-1)]=result.CantidadEventos;
								
								array_calendario[dia]=result.Energia;
								
								total_energia_mes+=parseInt(result.Energia);
						
							});
							
							var datos = {
								labels: array_fechas.reverse(), 
								datasets: [
									{
										fillColor: "rgba(129,16,72,0.5)",
										strokeColor: "rgba(129,16,72,1)",
										pointColor: "rgba(129,16,72,1)",
										pointStrokeColor: "#fff",
										pointHighlightFill: "#fff",
										pointHighlightStroke: "rgba(129,16,72,1)",
										data: array_lecturas.reverse()
									}
								]
							};
						}

						$("#"+container).html(cadena);
						
						$("#total_energia_mes").html(total_energia_mes+" kWh");
						
						var width_canvas=$(".section_01").width(); 
						$("#grafica_mensual").attr("width",width_canvas);
						
						$.datepicker.regional['es'] = {
							closeText: 'Cerrar',
							prevText: '<Ant',
							nextText: 'Sig>',
							currentText: 'Hoy',
							monthNames: monthNames,
							dayNamesMin: daysNamesMini,
							weekHeader: 'Sm',
							isRTL: false,
							showMonthAfterYear: false,
							yearSuffix: '',
							inline: true,
							firstDay: 1,
							showOtherMonths: false,
						};
						$.datepicker.setDefaults($.datepicker.regional['es']);
	
						$('#calendario').datepicker({
											hideIfNoPrevNext: false,
											showButtonPanel: false,
											defaultDate:new Date(fecha_calendario[1]+"-"+fecha_calendario[2]+"-"+fecha_calendario[0]),
											onChangeMonthYear: function(year, month, widget) {
															//reloadCalendar(month, year);
														}
										});		
									
						$.datepicker._selectDate = function(id, dateStr) {						
							//No hacemos nada al seleccionar un día, la acción ya está metida en el div de energía
							var target = $(id);
							var inst = this._getInst(target[0]);							
						}	
						
						$(".ui-datepicker-calendar .ui-state-default").each(function () {
							//Comprueba si es el mes y año seleccionado
							if($(".ui-datepicker-year").first().html() == fecha_calendario[0] && $(".ui-datepicker-month").first().html() == monthNames[parseInt(fecha_calendario[1])-1])
							{
								 //Si existe el día en el array de lecturas 
								 if(array_fechas[parseInt($(this).html())-1])
								 {
									var valor=array_lecturas[parseInt($(this).html())-1];
									
									var eventos=array_eventos[parseInt($(this).html())-1];

									 //Añadimos la energía a la celda del día
									 var clase="";
									 
									 var energiaMaxima = potencia_instalacion * 0.006;
										
									 if(valor<energiaMaxima*0.33)
										clase="e_baja";
									 else if(valor<energiaMaxima*0.66)
										clase="e_media";
									 else 
										clase="e_alta";
																											 
									// if(getLocalStorage("premium")==FLAG_PREMIUMPLUS)
									 if(mantenedores[id_instalacion].premiumplus==true)
									 {
										if(eventos>0)
										{
											$(this).append("<div class='badge' onclick='window.location.href=\"lecturas.html?id="+valores[1]+"&fecha="+fecha_calendario[0]+"-"+fecha_calendario[1]+"-"+parseInt($(this).html())+"&tipo=dia\"'>"+eventos+"</div>");
										}
										
										$(this).append("<div class='energia_02 "+clase+"' onclick='window.location.href=\"lecturas.html?id="+valores[1]+"&fecha="+fecha_calendario[0]+"-"+fecha_calendario[1]+"-"+parseInt($(this).html())+"&tipo=dia\"'>"+valor+"</div>");
									 }
									 //if(getLocalStorage("premium")==FLAG_PREMIUM)
									 if(mantenedores[id_instalacion].premium==true)
									 {
										$(this).append("<div class='energia_02 "+clase+"'>"+valor+"</div>");
									 }
								 }
								 else
								 {
									if(eventos>0)
									{
										$(this).append("<div class='badge'>!</div>");
									}
										
									$(this).append("<div class='sin_datos_energia'> </div>");
								 }
							}

						 });
						 	
						
						if(data.length!=0) {
						
							// Gráfica
							var ctx = document.getElementById("grafica_mensual").getContext("2d");
							var myGrafica = new Chart(ctx).Bar(datos,
										{
											scaleShowLabels: false,
											barStrokeWidth : 1,
											barValueSpacing : 2,
											tooltipTemplate: "<%= value %>",
											responsive: true,
										});
						}
						
					}
					
					if(type=="dia")
					{
						var cadena="";
						
						var array_horas=new Array();
						var array_lecturas=new Array();
						var total_energia_dia=0;
						
						if(mantenedores!=null)
						{
							if(mantenedores[id_instalacion]!=null)
								if(mantenedores[id_instalacion].logoM!="")
									cadena+="<img src='data:image/png;base64,"+mantenedores[id_instalacion].logoM+"' class='img_mantenedor' />";
						}
						
						cadena+="<h2 style='word-wrap: break-word;'>"+mantenedores[id_instalacion].nombreI+"</h2>";
						
						cadena+='<div class="clear_01"> </div>';
						
						cadena+="<div id='total_energia_dia' class='total_energia'> </div>";
						
						cadena+='<canvas id="grafica_mensual" width="250" height="170" style="max-width:100%; max-height: 250px;" ></canvas>';
						
						if(data.Eventos.length>0)
						{
							cadena+="<div class='clear_02'> </div>";
							cadena+="<a class='mostrar_ocultar' onclick='$(\"#eventos_dia\").toggle();$(this).hide()'>MOSTRAR EVENTOS/ALERTAS</a>";
							
							cadena+="<table border='0' class='tabla_lecturas' id='eventos_dia' style='display:none' >";
							$.each(data.Eventos, function(index, result) {  
							
								var fecha=(result.Fecha).toString().split("T");	
								var tiempo_formateado=fecha[1];	
		
								cadena+="<tr>";
								cadena+="<td>"+tiempo_formateado+"</td><td style='text-align:left'>"+result.Descripcion+"</td>";
								cadena+="</tr>";
						
							});
							cadena+="</table>";
							cadena+="<div class='clear_02'> </div>";
						}
						cadena+="<div class='clear_02'> </div>";
						
						if(data.length==0) {
							cadena+="No hay informaci&oacute;n.";
						}
						else
						{
							var fecha_orto=(data.Orto).toString().split("T");	
							var tiempo_orto=fecha_orto[1];		

							var fecha_ocaso=(data.Ocaso).toString().split("T");	
							var tiempo_ocaso=fecha_ocaso[1];								
							
							cadena+="<div class='orto'><img src='./resources/images/general/orto.png' alt='Orto' /> "+tiempo_orto+"</div>";
							cadena+="<div class='ocaso'><img src='./resources/images/general/ocaso.png' alt='Ocaso' />"+tiempo_ocaso+"</div>";
							
							cadena+="<div class='clear_01'> </div>";
							
							cadena+='<div style="position:relative"><br>';
							cadena+="<h3 style='text-align:center;'>"+fecha_calendario[2]+" de "+monthNames[parseInt(fecha_calendario[1])-1]+" de "+fecha_calendario[0]+"</h3>";
							
							cadena+="<div class='contenedor_flechas'><br>"+
									"<a href='lecturas.html?id="+id_instalacion+"&fecha="+fecha_calendario[0]+"-"+addZero(parseInt(fecha_calendario[1]))+"-"+addZero(parseInt(fecha_calendario[2])-1)+"&tipo=dia' style='float:left'><img src='./resources/images/general/arrow_left.png' alt='Anterior' width='18' /></a>"+
									"<a href='lecturas.html?id="+id_instalacion+"&fecha="+fecha_calendario[0]+"-"+addZero(parseInt(fecha_calendario[1]))+"-"+addZero(parseInt(fecha_calendario[2])+1)+"&tipo=dia' style='float:right'><img src='./resources/images/general/arrow_right.png' alt='Siguiente' width='18' /></a><div class='clear_01'> </div></div>";
							
							cadena+='<div class="clear_02"> </div>';
							
							cadena+='</div>';
							
							cadena+="<table border='0' class='tabla_lecturas'>";
							$.each(data.Lecturas, function(index, result) {  
							
								var fecha=(result.Fecha).toString().split("T");	
								var horas=fecha[1].split(":");
								var tiempo_formateado=fecha[1];		
								
								array_horas[index]=horas[0];
								array_lecturas[index]=result.Energia;
								total_energia_dia+=parseInt(result.Energia);
								
								if(result.Energia>0)
								{	
									cadena+="<tr>";
									cadena+="<td>"+tiempo_formateado+"</td><td><span class='energia'>"+result.Energia+" kWh</span></td>";
									cadena+="</tr>";
								}
						
							});
							cadena+="</table>";
							
							cadena+='<div class="clear_02"> </div>';
							
							var datos = {
								labels: array_horas, 
								datasets: [
									{
										fillColor: "rgba(129,16,72,0.5)",
										strokeColor: "rgba(129,16,72,1)",
										pointColor: "rgba(129,16,72,1)",
										pointStrokeColor: "#fff",
										pointHighlightFill: "#fff",
										pointHighlightStroke: "rgba(129,16,72,1)",
										data: array_lecturas
									}
								]
							};
						}

						$("#"+container).html(cadena);
						
						if(data.length!=0) 
						{
						
							$("#total_energia_dia").html(total_energia_dia+" kWh");
							
							var width_canvas=$(".section_01").width(); 
							$("#grafica_mensual").attr("width",width_canvas);
							
							// Gráfica
							var ctx = document.getElementById("grafica_mensual").getContext("2d");
							var myGrafica = new Chart(ctx).Line(datos, {
											responsive: true,
											scaleShowLabels: false,
											tooltipTemplate: "<%= value %>",
											pointDot: false
										});
						}
					}				
					
					break;
					
		}
	
	}
	function f_error(jqXHR, textStatus, errorThrown){
		//alert('Error: '+textStatus+" - "+errorThrown);	
	
		if(jqXHR.status == 404) {
			$("#"+container).html("No hay informaci&oacute;n");
			return;
		}
		else if(jqXHR.status == 401) {
			$("#"+container).html("No tiene autorizaci&oacute;n para ver esta secci&oacute;n. Si ha cambiado de contrase&ntilde;a recientemente, por favor cierre sesi&oacute;n y vuelva a conectarse con la nueva contrase&ntilde;a. Disculpe las molestias.");
			
			setLocalStorage("user_session","");
			setLocalStorage("premium","");
			setLocalStorage("notificacion","");
			setLocalStorage("api-key","");
			setLocalStorage("Instalacion","");
			
			window.localStorage.clear();
			
			window.location.href='index.html';
			
			return;
		}
		else if(jqXHR.status == 500) {
			$("#"+container).html("Ha sucedido un error. Disculpe las molestias.");
			return;
		}
		else
		{
			$("#"+container).html("Necesita tener conexi&oacute;n a internet para acceder a esta secci&oacute;n.");
			return;
		}
	}
		 
}

function addZero(number) {
	if(number<10) 
	{
		number="0"+number;
	}
	return number;
}

function get_var_url(variable){

	var tipo=typeof variable;
	var direccion=location.href;
	var posicion=direccion.indexOf("?");
	
	posicion=direccion.indexOf(variable,posicion) + variable.length; 
	
	if (direccion.charAt(posicion)== "=")
	{ 
        var fin=direccion.indexOf("&",posicion); 
        if(fin==-1)
        	fin=direccion.length;
        	
        return direccion.substring(posicion+1, fin); 
    } 
	else
		return false;
	
}

function setLocalStorage(keyinput,valinput) 
{
	if(typeof(window.localStorage) != 'undefined') { 
		window.localStorage.setItem(keyinput,valinput); 
	} 
	else { 
		alert("localStorage no definido"); 
	}
}
function getLocalStorage(keyoutput)
{
	if(typeof(window.localStorage) != 'undefined') { 
		return window.localStorage.getItem(keyoutput); 
	} 
	else { 
		alert("localStorage no definido"); 
	}
}
function setSessionStorage(keyinput,valinput)
{
	if(typeof(window.sessionStorage) != 'undefined') { 
		window.sessionStorage.setItem(keyinput,valinput); 
	} 
	else { 
		alert("sessionStorage no definido"); 
	}
}
function getSessionStorage(keyoutput)
{
	if(typeof(window.sessionStorage) != 'undefined') { 
		return window.sessionStorage.getItem(keyoutput); 
	} 
	else { 
		alert("sessionStorage no definido"); 
	}
}

/* Sin uso actualmente */
function show_notification(msg)  
{
	/*window.plugin.notification.local.add({
		id:         String,  // A unique id of the notification
		date:       Date,    // This expects a date object
		message:    String,  // The message that is displayed
		title:      String,  // The title of the message
		repeat:     String,  // Either 'secondly', 'minutely', 'hourly', 'daily', 'weekly', 'monthly' or 'yearly'
		badge:      Number,  // Displays number badge to notification
		sound:      String,  // A sound to be played
		data:       String,  // Data to be passed through the notification
		autoCancel: Boolean, // Setting this flag and the notification is automatically canceled when the user clicks it
		ongoing:    Boolean, // Prevent clearing of notification (Android only)
	});*/
	
	var f_last_update=new Date(parseInt(getLocalStorage("fecha")));
	var mensaje='';//+f_last_update.toString();
	
	now=new Date().getTime();
	var _10_seconds_from_now = new Date(now + 10*1000);
	setLocalStorage("fecha", now);
	
	if(msg[0]["news"]>0)
	{
		mensaje+=''+msg[0]["news"]+' NOTICIAS\r\n';
	}
	if(msg[1]["circular"]>0)
	{	
		mensaje+=''+msg[1]["circular"]+' CIRCULARES\r\n';	
	}
	
	if(msg[0]["news"]>0 || msg[1]["circular"]>0)
	{			
		window.plugin.notification.local.add({
			id:      id_notificacion,
			date:    _10_seconds_from_now, 
			title:   'Notificaciones Anpier',
			message: mensaje,
			autoCancel: true
		});
	}
	
}