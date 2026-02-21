"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
var common_1 = require("@nestjs/common");
var swagger_1 = require("@nestjs/swagger");
var jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
var UserController = function () {
    var _classDecorators = [(0, swagger_1.ApiTags)('Users'), (0, common_1.Controller)('users'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, swagger_1.ApiBearerAuth)('JWT-auth')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _findAll_decorators;
    var _findOne_decorators;
    var _getUserRoles_decorators;
    var _addUserRole_decorators;
    var _removeUserRole_decorators;
    var UserController = _classThis = /** @class */ (function () {
        function UserController_1(userService) {
            this.userService = (__runInitializers(this, _instanceExtraInitializers), userService);
        }
        UserController_1.prototype.findAll = function () {
            return this.userService.findAll();
        };
        UserController_1.prototype.findOne = function (userId) {
            return this.userService.findOne(userId);
        };
        UserController_1.prototype.getUserRoles = function (userId) {
            return this.userService.getRoles(userId);
        };
        UserController_1.prototype.addUserRole = function (userId, body) {
            return this.userService.addRole(userId, body);
        };
        UserController_1.prototype.removeUserRole = function (userId, roleAssignmentId) {
            return this.userService.removeRole(userId, roleAssignmentId);
        };
        return UserController_1;
    }());
    __setFunctionName(_classThis, "UserController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _findAll_decorators = [(0, common_1.Get)(), (0, swagger_1.ApiOperation)({ summary: 'Get all users' }), (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns list of users' }), (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' })];
        _findOne_decorators = [(0, common_1.Get)(':userId'), (0, swagger_1.ApiOperation)({ summary: 'Get user by ID' }), (0, swagger_1.ApiParam)({ name: 'userId', description: 'User ID' }), (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns user details' }), (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }), (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' })];
        _getUserRoles_decorators = [(0, common_1.Get)(':userId/roles'), (0, swagger_1.ApiOperation)({ summary: 'Get user roles' }), (0, swagger_1.ApiParam)({ name: 'userId', description: 'User ID' }), (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns user roles' }), (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' })];
        _addUserRole_decorators = [(0, common_1.Post)(':userId/roles'), (0, swagger_1.ApiOperation)({ summary: 'Add role to user' }), (0, swagger_1.ApiParam)({ name: 'userId', description: 'User ID' }), (0, swagger_1.ApiBody)({
                schema: {
                    type: 'object',
                    properties: {
                        scopeType: { type: 'string', example: 'global' },
                        projectId: { type: 'string', example: 'project-123' },
                        role: { type: 'string', example: 'developer' },
                    },
                    required: ['scopeType', 'role'],
                },
            }), (0, swagger_1.ApiResponse)({ status: 200, description: 'Role added successfully' }), (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' })];
        _removeUserRole_decorators = [(0, common_1.Delete)(':userId/roles/:roleAssignmentId'), (0, swagger_1.ApiOperation)({ summary: 'Remove role from user' }), (0, swagger_1.ApiParam)({ name: 'userId', description: 'User ID' }), (0, swagger_1.ApiParam)({ name: 'roleAssignmentId', description: 'Role assignment ID' }), (0, swagger_1.ApiResponse)({ status: 200, description: 'Role removed successfully' }), (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' })];
        __esDecorate(_classThis, null, _findAll_decorators, { kind: "method", name: "findAll", static: false, private: false, access: { has: function (obj) { return "findAll" in obj; }, get: function (obj) { return obj.findAll; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findOne_decorators, { kind: "method", name: "findOne", static: false, private: false, access: { has: function (obj) { return "findOne" in obj; }, get: function (obj) { return obj.findOne; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getUserRoles_decorators, { kind: "method", name: "getUserRoles", static: false, private: false, access: { has: function (obj) { return "getUserRoles" in obj; }, get: function (obj) { return obj.getUserRoles; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _addUserRole_decorators, { kind: "method", name: "addUserRole", static: false, private: false, access: { has: function (obj) { return "addUserRole" in obj; }, get: function (obj) { return obj.addUserRole; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _removeUserRole_decorators, { kind: "method", name: "removeUserRole", static: false, private: false, access: { has: function (obj) { return "removeUserRole" in obj; }, get: function (obj) { return obj.removeUserRole; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        UserController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return UserController = _classThis;
}();
exports.UserController = UserController;
