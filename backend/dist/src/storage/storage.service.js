"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const mime = __importStar(require("mime-types"));
let StorageService = class StorageService {
    uploadDir = path.join(process.cwd(), 'uploads');
    async saveFile(tenantId, file) {
        const tenantDir = path.join(this.uploadDir, tenantId);
        await fs_1.promises.mkdir(tenantDir, { recursive: true });
        const ext = path.extname(file.originalname);
        const filename = `${crypto.randomUUID()}${ext}`;
        const filePath = path.join(tenantDir, filename);
        await fs_1.promises.writeFile(filePath, file.buffer);
        return path.join(tenantId, filename);
    }
    async saveFileBuffer(tenantId, buffer, originalName) {
        const tenantDir = path.join(this.uploadDir, tenantId);
        await fs_1.promises.mkdir(tenantDir, { recursive: true });
        const ext = path.extname(originalName);
        const filename = `${crypto.randomUUID()}${ext}`;
        const filePath = path.join(tenantDir, filename);
        await fs_1.promises.writeFile(filePath, buffer);
        return path.join(tenantId, filename);
    }
    async getFile(relativePath) {
        const filePath = path.join(this.uploadDir, relativePath);
        const fileName = path.basename(relativePath);
        try {
            const buffer = await fs_1.promises.readFile(filePath);
            const mimeType = mime.lookup(filePath) || 'application/octet-stream';
            return { buffer, mimeType, fileName };
        }
        catch (error) {
            throw new common_1.NotFoundException(`File not found: ${relativePath}`);
        }
    }
    async deleteFile(relativePath) {
        const filePath = path.join(this.uploadDir, relativePath);
        try {
            await fs_1.promises.unlink(filePath);
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }
    getAbsolutePath(relativePath) {
        return path.join(this.uploadDir, relativePath);
    }
    async fileExists(relativePath) {
        const filePath = path.join(this.uploadDir, relativePath);
        try {
            await fs_1.promises.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = __decorate([
    (0, common_1.Injectable)()
], StorageService);
//# sourceMappingURL=storage.service.js.map