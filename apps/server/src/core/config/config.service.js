"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigService = void 0;
var common_1 = require("@nestjs/common");
var ConfigService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var ConfigService = _classThis = /** @class */ (function () {
        function ConfigService_1(nestConfigService) {
            this.nestConfigService = nestConfigService;
        }
        ConfigService_1.prototype.get = function (key) {
            return this.nestConfigService.get(key);
        };
        ConfigService_1.prototype.getOrThrow = function (key) {
            var value = this.nestConfigService.get(key);
            if (value === undefined) {
                throw new Error("Configuration key \"".concat(key, "\" is required but not set"));
            }
            return value;
        };
        Object.defineProperty(ConfigService_1.prototype, "nodeEnv", {
            get: function () {
                var _a;
                return ((_a = this.get('NODE_ENV')) !== null && _a !== void 0 ? _a : 'development');
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ConfigService_1.prototype, "port", {
            get: function () {
                var _a;
                return Number((_a = this.get('PORT')) !== null && _a !== void 0 ? _a : 4300);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ConfigService_1.prototype, "databaseUrl", {
            get: function () {
                return this.getOrThrow('DATABASE_URL');
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ConfigService_1.prototype, "jwtSecret", {
            get: function () {
                return this.getOrThrow('JWT_SECRET');
            },
            enumerable: false,
            configurable: true
        });
        return ConfigService_1;
    }());
    __setFunctionName(_classThis, "ConfigService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ConfigService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ConfigService = _classThis;
}();
exports.ConfigService = ConfigService;
