/**
 * Simple validation function to check the config object has been setup correctly (maybe setup JSON schema if it becomes more complex)
 * @param config
 */
const validate = (config) => {
    if(!config.services || !config.services.length) throw new Error('No services specified');

    config.services.forEach((service, idx) => {
        if(!service.path || service.path === '') throw new Error(`No path specified for service created at index ${idx}`);
        if(typeof service.path[0] !== 'string') throw new Error(`Path specified for service created at index ${idx} is not a string`);
        if(service.path[0] !== '/') throw new Error(`Path specified for service created at index ${idx} has no preceding '/'`);
        if(service.enabled && (!service.name || service.name ==='')) throw new Error(`Service is enabled but url has not been specified at index ${idx}`);
        if(!service.enabled && (!service.response)) throw new Error(`Service is disabled but no response has not been specified at index ${idx}`);
        if(!service.types) throw new Error(`Service request types (e.g. GET, POST, etc) have not been specified at index ${idx}`);
        if(!Array.isArray(service.types)) throw new Error(`Service request types (e.g. GET, POST, etc) should be of type Array ${idx}`);
        if(service.types.length === 0) throw new Error(`Service request types (e.g. GET, POST, etc) have not been specified at index ${idx}`);
    })
};

module.exports = validate;