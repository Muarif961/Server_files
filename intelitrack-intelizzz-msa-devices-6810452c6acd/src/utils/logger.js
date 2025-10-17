const Chalk = require("chalk");

function _logMessages(messages) {
    messages = messages || [];
    messages = ["\nLOG => ", ...messages, "\n"];
    console.log(messages.join(" "));
}

function _logInfo(info) {
    info = info || [];
    info = ["\nINFO => ", ...info, "\n"];
    console.log(Chalk.blue(info.join(" ")));
}

function _logWarnings(warnings) {
    warnings = warnings || [];
    warnings = ["\nWARNING => ", ...warnings, "\n"];
    console.log(Chalk.yellow(warnings.join(" ")));
}

function _logErrors(errors) {
    errors = errors || [];
    errors = ["\nERROR => ", ...errors, "\n"];
    console.log(Chalk.red(errors.join(" ")));
}

function _logger(type, ...messages) {
    try {
        if ((!messages || !Array.isArray(messages) || !messages.length) && type.trim().toLowerCase() !== "error" && type.trim().toLowerCase() !== "warning") {
            return;
        }

        type = type || "log";
        messages.forEach((message, idx) => {
            if (typeof message === 'object') messages[idx] = JSON.stringify(message, null, 2);
        });

        // Always log errors and warnings regardless of DISABLE_LOGS
        if (type.trim().toLowerCase() === "error" || type.trim().toLowerCase() === "warning") {
            switch (type.trim().toLowerCase()) {
                case "warning": _logWarnings(messages); break;
                case "error": _logErrors(messages); break;
            }
            return;
        }

        // Log other types only if DISABLE_LOGS is not set
        if (!process.env.DISABLE_LOGS) {
            switch (type.trim().toLowerCase()) {
                case "log": _logMessages(messages); break;
                case "info": _logInfo(messages); break;
                default: _logMessages(messages); break;
            }
        }
    } catch (error) {
        console.log(error.stack);
    }
};

module.exports = logger = {
    log: (...messages) => _logger('log', ...messages),
    info: (...messages) => _logger('info', ...messages),
    warning: (...messages) => _logger('warning', ...messages),
    error: (...messages) => _logger('error', ...messages),
};
