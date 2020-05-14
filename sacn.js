var sacn = require('e131');
var sacnClient = sacn.client;
var instance_skel = require('../../instance_skel');
var log;


function instance(system, id, config) {
	var self = this;

	// super-constructor
	instance_skel.apply(this, arguments);

	self.actions(); // export actions

	return self;
}

instance.prototype.updateConfig = function(config) {
	var self = this;

	self.config = config;

	self.init_sacn();
};

instance.prototype.init = function() {
	var self = this;

	debug = self.debug;
	log = self.log;

	self.status(self.STATE_UNKNOWN);

	self.init_sacn();

	self.timer = setInterval(function () {
		if (self.client !== undefined) {
			self.client.send(self.packet);
		}
	}, 1000);
};

instance.prototype.terminate = function() {
	var self = this;

	if(self.client !== undefined) {
		self.packet.setOptions(self.packet.Options.TERMINATED, true);
		self.client.send(self.packet);
	}
	
	delete self.client;
	delete self.packet;
	delete self.data;
};	

instance.prototype.init_sacn= function() {
	var self = this;

	self.status(self.STATE_UNKNOWN);

	if(self.client !== undefined) {
		self.terminate();
	}

	if(self.config.host) {
		self.client = new sacnClient(self.config.host);
		self.packet = self.client.createPacket(512);
		self.data = self.packet.getSlotsData();

		self.packet.setSourceName("Companion App");
		self.packet.setUniverse(self.config.universe || 0x1);
		self.packet.setPriority(self.config.priority || self.packet.DEFAULT_PRIORITY);

		for(var i=0; i<self.data.length; i++) {
			self.data[i] = 0x00;
		}
	}

	self.status(self.STATE_OK);
};

// Return config fields for web config
instance.prototype.config_fields = function () {

	var self = this;
	var fields = [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'This module will transmit SACN packets to the ip and universe you specify below. If you need more universes, add multiple SACN instances.'
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Receiver IP',
			width: 6,
			regex: self.REGEX_IP
		},
		{
			type: 'number',
			id: 'priority',
			label: 'Priority (1-201)',
			min: 1,
			max: 201
		},
		{
			type: 'textinput',
			id: 'universe',
			label: 'Universe number (0-63)',
			width: 6,
			default: 0,
			regex: '/^0*([0-9]|[1-5][0-9]|6[0-3])$/'
		}
	];
	return fields;
};

// When module gets deleted
instance.prototype.destroy = function() {
	var self = this;

	if (self.client !== undefined) {
		self.terminate();
	}

	if (self.timer) {
		clearInterval(self.timer);
		self.timer = undefined;
	}

	if (self.client !== undefined) {
		self.terminate();
	}

};


instance.prototype.actions = function(system) {
	var self = this;
	self.system.emit('instance_actions', self.id, {

		'set': {
			label:'Set value',
			options: [
				{
					 type: 'textinput',
					 label: 'Channel (Range 1-512)',
					 id: 'channel',
					 default: '1',
					 regex: '/^0*([1-9]|[1-8][0-9]|9[0-9]|[1-4][0-9]{2}|50[0-9]|51[012])$/' // 1-512
				},
				{
					 type: 'textinput',
					 label: 'Value (Range 0-255)',
					 id: 'value',
					 default: '0',
					 regex: '/^0*([0-9]|[1-8][0-9]|9[0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/' // 0-255
				}
			]
		},
		'close': {
			label:'Close SACN'
		}

	});
}

instance.prototype.action = function(action) {
	var self = this;


	switch (action.action) {

		case 'set':
			if (self.client !== undefined) {
				self.data[action.options.channel-1] = action.options.value;
				self.client.send(self.packet);
			}
			break;
		case 'close':
			if (self.client !== undefined) {
				self.terminate();
			}
			break;

	}

};

instance_skel.extendedBy(instance);
exports = module.exports = instance;
