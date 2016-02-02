/**
 * Copyright 2016 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function (RED) {
	
  // Require the Cloud Foundry Module to pull credentials from bound service 
  // If they are found then they are stored in sUsername and sPassword, as the 
  // service credentials. This separation from sUsername and username to allow 
  // the end user to modify the node credentials when the service is not bound.
  // Otherwise, once set username would never get reset, resulting in a frustrated
  // user who, when he errenously enters bad credentials, can't figure out why
  // the edited ones are not being taken.
	
  var cfenv = require('cfenv');
  var services = cfenv.getAppEnv().services;

  var username, password, sUsername, sPassword;
  var service = cfenv.getAppEnv().getServiceCreds(/dialog/i)
  
  if (service) {
    sUsername = service.username;
    sPassword = service.password;
  }
  
  RED.httpAdmin.get('/service-dialog/vcap', function (req, res) {
		res.json(service ? {bound_service: true} : null);
  });  
  
  
  // This is the Dialog Node. 
  // The node supports three modes
  // list - retrieves a list of the Dialogs
  // startconverse - initiates a conversation with an existing conversation
  // converse - continues with a started conversation
  // getprofile - GETs the profile variables associated with the dialog
  function WatsonDialogNode (config) {
    RED.nodes.createNode(this, config);
    var node = this;
   
    this.log('Watson Developer Cloud Contribution - Dialog Node Instantiated') 
	
    this.on('input', function (msg) {
      this.log('Watson Developer Cloud Contribution - Input received') 
		
      if (!msg.payload) {
			var message = 'Missing property: msg.payload';
			node.error(message, msg);
			return;
      }

      username = sUsername || this.credentials.username;
      password = sPassword || this.credentials.password;
      this.status({});  
			
      if (!username || !password) {
        this.status({fill:"red", shape:"ring", text:"missing credentials"});  
        var message = 'Missing Watson Dialog service credentials';
        this.error(message, msg);
        return;
      } 

      var watson = require('watson-developer-cloud');	  

      var dialog = watson.dialog({
        username: username,
        password: password,
        version: 'v1'
      });	  

      var params = {}
      if (config.mode === 'create') {
        performCreate(node,dialog,msg);
      } else if (config.mode === 'list') {
        performList(node,dialog,msg);
      } else if (config.mode === 'startconverse' || config.mode === 'converse' || config.mode === 'getprofile') {
          dialogid = config.dialog;
          clientid = config.clientid;
          converseid = config.converse;

          if (!dialogid || "" == dialogid) {
            if (msg.dialog_params && "dialog_id" in msg.dialog_params) {
              dialogid = msg.dialog_params["dialog_id"];
            }	
          }				  
		  
          if (!dialogid || "" == dialogid) {
            var message = "Missing Dialog ID";
            node.status({fill:"red", shape:"dot", text:message});	
            node.error(message, msg);	
          }			
			
          if (config.mode === 'converse'  || config.mode === 'getprofile') {
            if (!clientid || "" == clientid) {
              if (msg.dialog_params && "client_id" in msg.dialog_params) {
                clientid = msg.dialog_params["client_id"];
              }	
            }				  
            if (!converseid || "" === converseid) {
              if (msg.dialog_params && "converse_id" in msg.dialog_params) {
                converseid = msg.dialog_params["converse_id"];
              }	
            }				  
		    if (!clientid || "" === clientid) {
              var message = "Missing Client ID";
              node.status({fill:"red", shape:"dot", text:message});	
              node.error(message, msg);	
            }
            if (!converseid || "" === converseid) {
              var message = "Missing Converstaion ID";
              node.status({fill:"red", shape:"dot", text:message});	
              node.error(message, msg);	
            }
            params.client_id = clientid;
            params.conversation_id = converseid;
          }

          params.dialog_id = dialogid;
          params.input = msg.payload;
		  
          if (config.mode === 'startconverse' || config.mode === 'converse') {			  
            node.status({fill:"blue", shape:"dot", text:"Starting Dialog Conversation"});
            dialog.conversation (params, function (err, dialog_data) {
              if (err) {
                node.status({fill:"red", shape:"ring", text:"call to dialog service failed"}); 
                node.error(err, msg);
              } else {
                node.status({fill:"green", shape:"dot", text:"dialog conversation successfull"});		  
                msg.dialog = dialog_data;		  
                msg.payload = "Check msg.dialog dialog data";
                node.send(msg);
              }   
            });
          }
          else {
            node.status({fill:"blue", shape:"dot", text:"Requesting dialog profile variables"});
            dialog.getProfile (params, function (err, dialog_data) {
              if (err) {
                node.status({fill:"red", shape:"ring", text:"call to dialog service failed"}); 
                node.error(err, msg);
              } else {
                node.status({fill:"green", shape:"dot", text:"Profile data retrieved successfully"});		  
                msg.dialog = dialog_data;		  
                msg.payload = "Check msg.dialog dialog data";
                node.send(msg);
              }  
            });
         }			  
      } 	  
    });
  }

  // This function creates a new dialog template. The name must be unique, the file can be in any
  // accepted format, and be either a text file or a binary buffer.
  function performCreate(node,dialog,msg) {
    var params = {}
    node.status({fill:"blue", shape:"dot", text:"requesting create of new dialog template"});	 
    if ('file' in msg.dialog_params && 'dialog_name' in msg.dialog_params) {
		
      var stream = require( "stream" );
      var bufferStream = new stream.Readable();
	  bufferStream.push(msg.dialog_params['file']);
      bufferStream.push(null);
	  
	  // Note: This line is very important. If forces the buffer to be read, allowing it to 
      // be sucessfully passed through to the dialog service.
      bufferStream.read();
	  
      params.file = bufferStream;
      params.name = msg.dialog_params['dialog_name'];

      dialog.createDialog(params, function(err, dialog_data){
            if (err) {
              node.status({fill:"red", shape:"ring", text:"call to dialog service failed"}); 
              node.error(err, msg);
            } else {
              node.status({fill:"green", shape:"dot", text:"Dialog template created successfully"});		  
              msg.dialog = dialog_data;		  
              msg.payload = "Check msg.dialog dialog data";
              node.send(msg);
            }  		  
      });	  	
    } else if (! 'file' in msg.dialog_params) {
      var errtxt = "Missing Dialog template file";
      node.status({fill:"red", shape:"ring", text:errtxt}); 		
      node.error(errtxt, msg); 
    }  else {
      errtxt = "Dialog Name not specified";
      node.status({fill:"red", shape:"ring", text:errtxt}); 		
      node.error(errtxt, msg); 
    }   
  }

  // This function performs the operation to fetch a list of all dialog templates
  function performList(node,dialog,msg) {
    node.status({fill:"blue", shape:"dot", text:"requesting list of dialogs"});	  
    
	dialog.getDialogs({}, function(err, dialogs){
	  if (err) {
        node.status({fill:"red", shape:"ring", text:"call to dialog service failed"});
        node.error(err, msg);		
      } else {
        node.status({fill:"green", shape:"dot", text:"dialog list successfully retrieved"});
        msg.dialog = dialogs;
        msg.payload = "Check msg.dialog for list of dialogs";
        node.send(msg);
      }		  
    });
  }		

  
  //Register the node as service-dialog to nodeRED 
  RED.nodes.registerType('service-dialog', 
                         WatsonDialogNode, 
                         {credentials: { username: {type:"text"},
                                         password: {type:"password"}
                                       }
                         });
							
};


