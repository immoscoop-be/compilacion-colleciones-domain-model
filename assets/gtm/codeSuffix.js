var queuePusherName = 'compilacionCollecionesClientosQueuePusher';
var queueName = 'compilacionCollecionesClientosGtmQueue';

function getQueuePush() {
    var existing = copyFromWindow(queuePusherName);
    if (existing) {
        return existing;
    }
    logToConsole('Creating new queue for', queueName);
    createQueue(queueName);
    setInWindow(queuePusherName, function () {
        var args = [];
        for (var i = 1; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        var queued = {
            method: arguments[0],
            arguments: args
        };
        callInWindow(queueName + '.push', queued);
        callInWindow('window.compilacionCollecionesClientosGtmFlush', '');
        logToConsole('Queued method call:', queued);
    });
    return copyFromWindow(queuePusherName);
}

if (data.trackerConfig.type === "compilacionCollecionesClientosGtmVariable_configuracion") {
    var cdn = false;
    if (data.trackerConfig.jsLibSource === "SELF") {
        cdn = data.trackerConfig.jsLibSource_selfHostedUrl;
    } else if (data.trackerConfig.jsLibSource === "UNPKG") {
        cdn = "https://unpkg.com/@compilacion/colleciones-clientos@latest/dist/browser.gtm.min.js";
    }
    var queuePush = getQueuePush();
    if (cdn) {
        injectScript(
            cdn,
            function () {
                logToConsole('Script loaded. Executing tag.');
                queuePush('tag', data);
                data.gtmOnSuccess();
            },
            function () {
                logToConsole('Failed to load script:', cdn);
                data.gtmOnFailure();
            },
            'compilacionCollecionesLib'
        );
    } else {
        logToConsole('No script URL provided. Falling back to direct queue push.');
        queuePush('tag', data);
        data.gtmOnSuccess();
    }
} else {
    logToConsole('trackerConfig.type mismatch:', data.trackerConfig.type);
    data.gtmOnFailure();
}
