import {createRTCViewMat, math} from "../../../math";
import {BindableDataTexture} from "./BindableDataTexture";
import {dataTextureRamStats} from "./dataTextureRamStats";

/**
 * @private
 */
export class DataTextureGenerator {
    /**
     * Enables the currently binded ````WebGLTexture```` to be used as a data texture.
     *
     * @param {WebGL2RenderingContext} gl
     *
     * @private
     */
    disableBindedTextureFiltering(gl) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    /**
     * Generate and return a `camera data texture`.
     *
     * The texture will automatically update its contents before each render when the camera matrix is dirty,
     * and to do so will use the following events:
     *
     * - `scene.rendering` event will be used to know that the camera texture should be updated
     * - `camera.matrix` event will be used to know that the camera matices changed
     *
     * @param {WebGL2RenderingContext} gl
     * @param {Camera} camera
     * @param {Scene} scene
     * @param {null|number[3]} origin
     * @returns {BindableDataTexture}
     */
    generateCameraDataTexture(gl, camera, scene, origin) {
        const textureWidth = 4;
        const textureHeight = 3; // space for 3 matrices
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, textureWidth, textureHeight);
        this.disableBindedTextureFiltering(gl);
        gl.bindTexture(gl.TEXTURE_2D, null);
        const cameraTexture = new BindableDataTexture(gl, texture, textureWidth, textureHeight);
        let cameraDirty = true;
        cameraTexture.updateViewMatrix = (viewMatrix, projMatrix) => {
            gl.bindTexture(gl.TEXTURE_2D, cameraTexture._texture);
            // Camera's "view matrix"
            gl.texSubImage2D(
                gl.TEXTURE_2D,
                0,
                0,
                0, // 1st matrix: camera view matrix
                4,
                1,
                gl.RGBA,
                gl.FLOAT,
                new Float32Array((origin) ? createRTCViewMat(viewMatrix, origin) : viewMatrix)
            );

            // Camera's "view normal matrix"
            gl.texSubImage2D(
                gl.TEXTURE_2D,
                0,
                0,
                1, // 2nd matrix: camera view normal matrix
                4,
                1,
                gl.RGBA,
                gl.FLOAT,
                new Float32Array(camera.viewNormalMatrix)
            );

            // Camera's "project matrix"
            gl.texSubImage2D(
                gl.TEXTURE_2D,
                0,
                0,
                2, // 3rd matrix: camera project matrix
                4,
                1,
                gl.RGBA,
                gl.FLOAT,
                new Float32Array(projMatrix)
            );
        };
        const onCameraMatrix = () => {
            if (!cameraDirty) {
                return;
            }
            cameraDirty = false;
            cameraTexture.updateViewMatrix(camera.viewMatrix, camera.project.matrix);
        };
        camera.on("matrix", () => cameraDirty = true);
        scene.on("rendering", onCameraMatrix);
        onCameraMatrix();
        return cameraTexture;
    }

    /**
     * Generate and return a texture containing camera view and projection
     * matrices for picking, relative to the given RTC coordinate system origin.
     *
     * @param {WebGL2RenderingContext} gl
     * @param {Camera} camera
     * @param {null|number[3]} origin
     * @returns {BindableDataTexture}
     */
    generatePickCameraDataTexture(gl, camera, origin) {
        const textureWidth = 4;
        const textureHeight = 3; // space for 3 matrices
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, textureWidth, textureHeight);
        this.disableBindedTextureFiltering(gl);
        gl.bindTexture(gl.TEXTURE_2D, null);
        const cameraTexture = new BindableDataTexture(gl, texture, textureWidth, textureHeight);
        cameraTexture.updateViewMatrix = (viewMatrix, projMatrix) => {
            gl.bindTexture(gl.TEXTURE_2D, cameraTexture._texture);
            // Camera's "view matrix"
            gl.texSubImage2D(
                gl.TEXTURE_2D,
                0,
                0,
                0, // 1st matrix: pick camera view matrix
                4,
                1,
                gl.RGBA,
                gl.FLOAT,
                new Float32Array((origin) ? createRTCViewMat(viewMatrix, origin) : viewMatrix)
            );

            // Camera's "view normal matrix"
            gl.texSubImage2D(
                gl.TEXTURE_2D,
                0,
                0,
                1, // 2nd matrix: pick camera view normal matrix
                4,
                1,
                gl.RGBA,
                gl.FLOAT,
                new Float32Array(camera.viewNormalMatrix)
            );

            // Camera's "project matrix"
            gl.texSubImage2D(
                gl.TEXTURE_2D,
                0,
                0,
                2, // 3rd matrix: pick camera project matrix
                4,
                1,
                gl.RGBA,
                gl.FLOAT,
                new Float32Array(projMatrix)
            );
        };
        return cameraTexture;
    }

    /**
     * Generate and return a `model data texture`.
     *
     * @param {WebGL2RenderingContext} gl
     * @param {DataTextureSceneModel} model
     *
     * @returns {BindableDataTexture}
     */
    generateModelTexture(gl, model) {
        const textureWidth = 4;
        const textureHeight = 2; // space for 2 matrices
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, textureWidth, textureHeight);
        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0, // x-offset
            0, // y-offset (model world matrix)
            4, // data width (4x4 values)
            1, // data height (1 matrix)
            gl.RGBA,
            gl.FLOAT,
            new Float32Array(model.worldMatrix)
        );
        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0, // x-offset
            1, // y-offset (model normal matrix)
            4, // data width (4x4 values)
            1, // data height (1 matrix)
            gl.RGBA,
            gl.FLOAT,
            new Float32Array(model.worldNormalMatrix)
        );
        this.disableBindedTextureFiltering(gl);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return new BindableDataTexture(gl, texture, textureWidth, textureHeight);
    }

    /**
     * This will generate an RGBA texture for:
     * - colors
     * - pickColors
     * - flags
     * - flags2
     * - vertex bases
     * - vertex base offsets
     *
     * The texture will have:
     * - 4 RGBA columns per row: for each object (pick) color and flags(2)
     * - N rows where N is the number of objects
     *
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<ArrayLike<int>>} colors Array of colors for all objects in the layer
     * @param {ArrayLike<ArrayLike<int>>} pickColors Array of pickColors for all objects in the layer
     * @param {ArrayLike<int>} vertexBases Array of position-index-bases foteh all objects in the layer
     * @param {ArrayLike<int>} indexBaseOffsets For triangles: array of offests between the (gl_VertexID / 3) and the position where the indices start in the texture layer
     * @param {ArrayLike<int>} edgeIndexBaseOffsets For edges: Array of offests between the (gl_VertexID / 2) and the position where the edge indices start in the texture layer
     * @param {ArrayLike<boolean>} solid Array is-solid flag for all objects in the layer
     *
     * @returns {BindableDataTexture}
     */
    generateTextureForColorsAndFlags(gl, colors, pickColors, vertexBases, indexBaseOffsets, edgeIndexBaseOffsets, solid) {
        const numPortions = colors.length;

        // The number of rows in the texture is the number of
        // objects in the layer.

        this.numPortions = numPortions;

        const textureWidth = 512 * 8;
        const textureHeight = Math.ceil(numPortions / (textureWidth / 8));

        if (textureHeight === 0) {
            throw "texture height===0";
        }

        // 8 columns per texture row:
        // - col0: (RGBA) object color RGBA
        // - col1: (packed Uint32 as RGBA) object pick color
        // - col2: (packed 4 bytes as RGBA) object flags
        // - col3: (packed 4 bytes as RGBA) object flags2
        // - col4: (packed Uint32 bytes as RGBA) vertex base
        // - col5: (packed Uint32 bytes as RGBA) index base offset
        // - col6: (packed Uint32 bytes as RGBA) edge index base offset
        // - col7: (packed 4 bytes as RGBA) is-solid flag for objects

        const texArray = new Uint8Array(4 * textureWidth * textureHeight);

        dataTextureRamStats.sizeDataColorsAndFlags += texArray.byteLength;
        dataTextureRamStats.numberOfTextures++;

        for (let i = 0; i < numPortions; i++) {
            // object color
            texArray.set(colors [i], i * 32 + 0);
            texArray.set(pickColors [i], i * 32 + 4); // object pick color
            texArray.set([0, 0, 0, 0], i * 32 + 8);     // object flags
            texArray.set([0, 0, 0, 0], i * 32 + 12);        // object flags2

            // vertex base
            texArray.set([
                    (vertexBases[i] >> 24) & 255,
                    (vertexBases[i] >> 16) & 255,
                    (vertexBases[i] >> 8) & 255,
                    (vertexBases[i]) & 255,
                ],
                i * 32 + 16
            );

            // triangles index base offset
            texArray.set(
                [
                    (indexBaseOffsets[i] >> 24) & 255,
                    (indexBaseOffsets[i] >> 16) & 255,
                    (indexBaseOffsets[i] >> 8) & 255,
                    (indexBaseOffsets[i]) & 255,
                ],
                i * 32 + 20
            );

            // edge index base offset
            texArray.set(
                [
                    (edgeIndexBaseOffsets[i] >> 24) & 255,
                    (edgeIndexBaseOffsets[i] >> 16) & 255,
                    (edgeIndexBaseOffsets[i] >> 8) & 255,
                    (edgeIndexBaseOffsets[i]) & 255,
                ],
                i * 32 + 24
            );

            // is-solid flag
            texArray.set([solid[i] ? 1 : 0, 0, 0, 0], i * 32 + 28);
        }
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8UI, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, texArray, 0);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return new BindableDataTexture(gl, texture, textureWidth, textureHeight, texArray);
    }

    /**
     * This will generate a texture for all object offsets.
     *
     * @param {WebGL2RenderingContext} gl
     * @param {int[]} offsets Array of int[3], one XYZ offset array for each object
     *
     * @returns {BindableDataTexture}
     */
    generateTextureForObjectOffsets(gl, numOffsets) {
        const textureWidth = 512;
        const textureHeight = Math.ceil(numOffsets / textureWidth);
        if (textureHeight === 0) {
            throw "texture height===0";
        }
        const texArray = new Float32Array(3 * textureWidth * textureHeight).fill(0);
        dataTextureRamStats.sizeDataTextureOffsets += texArray.byteLength;
        dataTextureRamStats.numberOfTextures++;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGB32F, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RGB, gl.FLOAT, texArray, 0);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return new BindableDataTexture(gl, texture, textureWidth, textureHeight, texArray);
    }

    /**
     * This will generate a texture for all positions decode matrices in the layer.
     *
     * The texture will have:
     * - 4 RGBA columns per row (each column will contain 4 packed half-float (16 bits) components).
     *   Thus, each row will contain 16 packed half-floats corresponding to a complete positions decode matrix)
     * - N rows where N is the number of objects
     *
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<Matrix4x4>} positionDecodeMatrices Array of positions decode matrices for all objects in the layer
     * @param {ArrayLike<Matrix4x4>} instanceMatrices Array of geometry instancing matrices for all objects in the layer. Null if the objects are not instanced.
     *
     * @returns {BindableDataTexture}
     */
    generateTextureForPositionsDecodeMatrices(gl, positionDecodeMatrices, instanceMatrices) {
        const numMatrices = positionDecodeMatrices.length;
        if (numMatrices === 0) {
            throw "num decode+entity matrices===0";
        }
        // in one row we can fit 512 matrices
        const textureWidth = 512 * 4;
        const textureHeight = Math.ceil(numMatrices / (textureWidth / 4));
        const texArray = new Float32Array(4 * textureWidth * textureHeight);
        dataTextureRamStats.sizeDataPositionDecodeMatrices += texArray.byteLength;
        dataTextureRamStats.numberOfTextures++;
        const tmpMatrix = math.mat4();
        for (let i = 0; i < positionDecodeMatrices.length; i++) {            // 4x4 values
            texArray.set(math.mulMat4(instanceMatrices[i], positionDecodeMatrices[i], tmpMatrix), i * 16);
        }
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RGBA, gl.FLOAT, texArray, 0);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return new BindableDataTexture(gl, texture, textureWidth, textureHeight);
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<int>} indices
     *
     * @returns {BindableDataTexture}
     */
    generateTextureFor8BitIndices(gl, indices) {
        if (indices.length === 0) {
            return {texture: null, textureHeight: 0,};
        }
        const textureWidth = 4096;
        const textureHeight = Math.ceil(indices.length / 3 / textureWidth);
        if (textureHeight === 0) {
            throw "texture height===0";
        }
        const texArraySize = textureWidth * textureHeight * 3;
        const texArray = new Uint8Array(texArraySize);
        dataTextureRamStats.sizeDataTextureIndices += texArray.byteLength;
        dataTextureRamStats.numberOfTextures++;
        texArray.fill(0);
        texArray.set(indices, 0)
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGB8UI, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RGB_INTEGER, gl.UNSIGNED_BYTE, texArray, 0);
        this.disableBindedTextureFiltering(gl);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return new BindableDataTexture(gl, texture, textureWidth, textureHeight);
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<int>} indices
     *
     * @returns {BindableDataTexture}
     */
    generateTextureFor16BitIndices(gl, indices) {
        if (indices.length === 0) {
            return {texture: null, textureHeight: 0,};
        }
        const textureWidth = 4096;
        const textureHeight = Math.ceil(indices.length / 3 / textureWidth);
        if (textureHeight === 0) {
            throw "texture height===0";
        }
        const texArraySize = textureWidth * textureHeight * 3;
        const texArray = new Uint16Array(texArraySize);
        dataTextureRamStats.sizeDataTextureIndices += texArray.byteLength;
        dataTextureRamStats.numberOfTextures++;
        texArray.fill(0);
        texArray.set(indices, 0)
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGB16UI, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RGB_INTEGER, gl.UNSIGNED_SHORT, texArray, 0);
        this.disableBindedTextureFiltering(gl);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return new BindableDataTexture(gl, texture, textureWidth, textureHeight);
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<int>} indices
     *
     * @returns {BindableDataTexture}
     */
    generateTextureFor32BitIndices(gl, indices) {
        if (indices.length === 0) {
            return {texture: null, textureHeight: 0};
        }
        const textureWidth = 4096;
        const textureHeight = Math.ceil(indices.length / 3 / textureWidth);
        if (textureHeight === 0) {
            throw "texture height===0";
        }
        const texArraySize = textureWidth * textureHeight * 3;
        const texArray = new Uint32Array(texArraySize);
        dataTextureRamStats.sizeDataTextureIndices += texArray.byteLength;
        dataTextureRamStats.numberOfTextures++;
        texArray.fill(0);
        texArray.set(indices, 0)
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGB32UI, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RGB_INTEGER, gl.UNSIGNED_INT, texArray, 0);
        this.disableBindedTextureFiltering(gl);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return new BindableDataTexture(gl, texture, textureWidth, textureHeight);
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<int>} edgeIndices
     *
     * @returns {BindableDataTexture}
     */
    generateTextureFor8BitsEdgeIndices(gl, edgeIndices) {
        if (edgeIndices.length === 0) {
            return {texture: null, textureHeight: 0};
        }
        const textureWidth = 4096;
        const textureHeight = Math.ceil(edgeIndices.length / 2 / textureWidth);
        if (textureHeight === 0) {
            throw "texture height===0";
        }
        const texArraySize = textureWidth * textureHeight * 2;
        const texArray = new Uint8Array(texArraySize);
        dataTextureRamStats.sizeDataTextureEdgeIndices += texArray.byteLength;
        dataTextureRamStats.numberOfTextures++;
        texArray.fill(0);
        texArray.set(edgeIndices, 0)
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RG8UI, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RG_INTEGER, gl.UNSIGNED_BYTE, texArray, 0);
        this.disableBindedTextureFiltering(gl);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return new BindableDataTexture(gl, texture, textureWidth, textureHeight);
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<int>} edgeIndices
     *
     * @returns {BindableDataTexture}
     */
    generateTextureFor16BitsEdgeIndices(gl, edgeIndices) {
        if (edgeIndices.length === 0) {
            return {texture: null, textureHeight: 0};
        }
        const textureWidth = 4096;
        const textureHeight = Math.ceil(edgeIndices.length / 2 / textureWidth);
        if (textureHeight === 0) {
            throw "texture height===0";
        }
        const texArraySize = textureWidth * textureHeight * 2;
        const texArray = new Uint16Array(texArraySize);
        dataTextureRamStats.sizeDataTextureEdgeIndices += texArray.byteLength;
        dataTextureRamStats.numberOfTextures++;
        texArray.fill(0);
        texArray.set(edgeIndices, 0)
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RG16UI, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RG_INTEGER, gl.UNSIGNED_SHORT, texArray, 0);
        this.disableBindedTextureFiltering(gl);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return new BindableDataTexture(gl, texture, textureWidth, textureHeight);
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<int>} edgeIndices
     *
     * @returns {BindableDataTexture}
     */
    generateTextureFor32BitsEdgeIndices(gl, edgeIndices) {
        if (edgeIndices.length === 0) {
            return {texture: null, textureHeight: 0,};
        }
        const textureWidth = 4096;
        const textureHeight = Math.ceil(edgeIndices.length / 2 / textureWidth);
        if (textureHeight === 0) {
            throw "texture height===0";
        }
        const texArraySize = textureWidth * textureHeight * 2;
        const texArray = new Uint32Array(texArraySize);
        dataTextureRamStats.sizeDataTextureEdgeIndices += texArray.byteLength;
        dataTextureRamStats.numberOfTextures++;
        texArray.fill(0);
        texArray.set(edgeIndices, 0)
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RG32UI, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RG_INTEGER, gl.UNSIGNED_INT, texArray, 0);
        this.disableBindedTextureFiltering(gl);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return new BindableDataTexture(gl, texture, textureWidth, textureHeight);
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<int>} positions Array of (uniquified) quantized positions in the layer
     *
     * This will generate a texture for positions in the layer.
     *
     * The texture will have:
     * - 1024 columns, where each pixel will be a 16-bit-per-component RGB texture, corresponding to the XYZ of the position
     * - a number of rows R where R*1024 is just >= than the number of vertices (positions / 3)
     *
     * @returns {BindableDataTexture}
     */
    generateTextureForPositions(gl, positions) {
        const numVertices = positions.length / 3;
        const textureWidth = 4096;
        const textureHeight = Math.ceil(numVertices / textureWidth);
        if (textureHeight === 0) {
            throw "texture height===0";
        }
        const texArraySize = textureWidth * textureHeight * 3;
        const texArray = new Uint16Array(texArraySize);
        dataTextureRamStats.sizeDataTexturePositions += texArray.byteLength;
        dataTextureRamStats.numberOfTextures++;
        texArray.fill(0);
        texArray.set(positions, 0);
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGB16UI, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RGB_INTEGER, gl.UNSIGNED_SHORT, texArray, 0);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return new BindableDataTexture(gl, texture, textureWidth, textureHeight);
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<int>} portionIdsArray
     *
     * @returns {BindableDataTexture}
     */
    generateTextureForPackedPortionIds(gl, portionIdsArray) {
        if (portionIdsArray.length === 0) {
            return {texture: null, textureHeight: 0,};
        }
        const lenArray = portionIdsArray.length;
        const textureWidth = 4096;
        const textureHeight = Math.ceil(lenArray / textureWidth);
        if (textureHeight === 0) {
            throw "texture height===0";
        }
        const texArraySize = textureWidth * textureHeight;
        const texArray = new Uint16Array(texArraySize);
        texArray.set(portionIdsArray, 0);
        dataTextureRamStats.sizeDataTexturePortionIds += texArray.byteLength;
        dataTextureRamStats.numberOfTextures++;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R16UI, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RED_INTEGER, gl.UNSIGNED_SHORT, texArray, 0);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return new BindableDataTexture(gl, texture, textureWidth, textureHeight);
    }
}