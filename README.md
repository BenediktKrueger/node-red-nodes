# WDC Contribution to NodeRED
This is a collection of Watson Developer Cloud services for NodeRED


**Currently the only way to incorporate these nodes is to add a dependency to this github repository inside the  
node red package.json file**

See the documentation in [node-red-labs](https://github.com/watson-developer-cloud/node-red-labs) to see how this is done

*These nodes will be made available as an NPM module*


## Watson Dialog Service
This service lists available dialogs and is able to start and runs a conversation against the dialog. 
Dialogs must have already been created. 

The the drop-down menu in the node configuration window is used to select the required mode.

###List Mode
A list of the available dialogs is returned. For each a dialog id is given, this id is needed to start a conversation.
The returned list from the service is made available at **msg.dialog**

###Start Conversation Mode
The conversation is started and the introduction salutation from the dialog is returned. 
In addition a client id and a converstion id are returned. These ids are needed to continue a conversation. 
The salutation from the service will be returned on **msg.dialog**

###Conversation Mode
The conversation is continued. The response from the service will be returned on **msg.dialog**
	
###List Profile Variables Mode
The profile variables as set by the dialog are retrieved. These can be used by an applicaiton to 
determine the state of the conversation, and to take any appropriate action.
 The response from the service will be returned on **msg.dialog**	
	
## License
Full license text is available in [LICENSE](LICENSE).
