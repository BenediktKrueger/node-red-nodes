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
  
  RED.httpAdmin.get('/wdc-dialog/vcap', function (req, res) {
		res.json(service ? {bound_service: true} : null);
  });  
  
  
  // This is the Dialog Node. 
  // The node supports three modes
  // list - retrieves a list of the Dialogs
  // startconverse - initiates a conversation with an existing conversation
  // converse - continues with a started conversation
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
      if (config.mode === 'list') {
        node.status({fill:"blue", shape:"dot", text:"requesting list of dialogs"});	  

        dialog.getDialogs({}, function (err, dialogs) {
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
      } else if (config.mode === 'startconverse' || config.mode === 'converse') {
          dialogid = config.dialog;
          clientid = config.clientid;
          converseid = config.converse;

          if (!dialogid || "" == dialog)
          {
            var message = "Missing Dialog ID";
            node.status({fill:"red", shape:"dot", text:message});	
            node.error(message, msg);	
          }			
			
          if (config.mode === 'converse') {
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
    });
  }
 
  //Register the node as wdc-dialog to nodeRED 
  RED.nodes.registerType(	'wdc-dialog', 
							WatsonDialogNode, 
							{credentials: {	username: {type:"text"},
											password: {type:"password"}
										  }
							});
							
};


