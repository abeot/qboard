import { fabric } from "fabric";
import AssertType from "../types/assert";
import { isFabricCollection } from "../types/fabric";
export default class Page extends fabric.Canvas {
    constructor() {
        super(...arguments);
        this.modified = false;
        this.fitToWindow = (canvasWidth, canvasHeight) => {
            const widthRatio = window.innerWidth / canvasWidth;
            const heightRatio = window.innerHeight / canvasHeight;
            this.setZoom(Math.min(widthRatio, heightRatio));
            this.setWidth(canvasWidth * this.getZoom());
            this.setHeight(canvasHeight * this.getZoom());
            this.canvasWidth = canvasWidth;
            this.canvasHeight = canvasHeight;
        };
        this.deactivateSelection = () => {
            this.isDrawingMode = false;
            this.selection = false;
            this.discardActiveObject();
            this.forEachObject((object) => {
                object.selectable = false;
            });
            this.requestRenderAll();
        };
        this.activateSelection = () => {
            this.isDrawingMode = false;
            this.selection = true;
            this.forEachObject((object) => {
                object.selectable = true;
            });
        };
        // kind of inefficient
        this.getObjectByIds = (ids) => this.getObjects().filter((object) => {
            AssertType(object);
            return (object.idVersion === 1 && object.id != null && ids.includes(object.id));
        });
        this.serialize = (objects) => {
            const selection = this.getActiveObjects();
            const reselect = selection.length > 1 && objects.some((obj) => selection.includes(obj));
            if (reselect) {
                this.discardActiveObject();
                this.setActiveObject(new fabric.ActiveSelection(selection, { canvas: this }));
            }
            return objects
                .map((obj) => 
            // This is needed for selection groups to be serialized properly.
            // If directly using `obj.toObject` it somehow depends on the selection remaining active,
            // as claimed in <https://github.com/fabricjs/fabric.js/blob/2eabc92a3221dd628576b1bb029a5dc1156bdc06/src/canvas.class.js#L1262-L1272>.
            //
            // We tried using that method in b9cb04c3dacd951785ce4e94ce0c629c09319ec3 but this caused issue #171.
            // See https://github.com/cjquines/qboard/issues/171
            // and https://github.com/cjquines/qboard/issues/176
            // for more details.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this._toObject(obj, "toObject", ["data", "strokeUniform"]))
                .map((obj) => {
                delete obj.id;
                return obj;
            });
        };
        this.apply = (ids, newObjects) => {
            const oldObjects = this.getObjectByIds(ids);
            this.remove(...oldObjects);
            if (newObjects === null || newObjects === void 0 ? void 0 : newObjects.length) {
                const addObjects = (objects) => {
                    objects.forEach((object, i) => {
                        object.id = ids[i];
                    });
                    this.add(...objects);
                    this.requestRenderAll();
                };
                fabric.util.enlivenObjects(newObjects, addObjects, "fabric");
            }
            this.requestRenderAll();
        };
        this.loadFromJSONAsync = async (json) => new Promise((resolve) => {
            super.loadFromJSON(json, () => {
                resolve();
            });
        });
        /**
         * Create a Fabric Image from {@param imageURL},
         * placed at the location defined by {@param cursor},
         * with custom options given by {@param options}.
         *
         * @warn Make sure that {@param options} does not contain enough properties to satisfy {@link isFabricCollection}
         */
        this.addImage = async (imageURL, cursor, options) => new Promise((resolve) => fabric.Image.fromURL(imageURL, (obj) => {
            AssertType(obj);
            // We are confident that we don't need this return value because we should get the original image back
            // Technically not true because `options` might be so large that it makes `obj` pass `isFabricCollection`
            // so we just warn against it
            this.placeObject(obj, cursor);
            resolve(obj);
        }, options));
        /**
         * Places {@param obj} at ({@param x}, {@param y}).
         * Returns the array of subobjects, if obj is a collection, or else a singleton containing obj
         */
        this.placeObject = (obj, _a) => {
            var _b;
            var { x = this.canvasWidth / 2, y = this.canvasHeight / 2, } = _a === void 0 ? (_b = this.cursor) !== null && _b !== void 0 ? _b : {} : _a;
            this.discardActiveObject();
            obj.set({
                left: x,
                top: y,
                originX: "center",
                originY: "center",
            });
            let returnObjects;
            if (isFabricCollection(obj)) {
                obj.canvas = this;
                obj.forEachObject((object) => {
                    this.add(object);
                });
                obj.setCoords();
                returnObjects = obj.getObjects();
            }
            else {
                this.add(obj);
                returnObjects = [obj];
            }
            this.setActiveObject(obj);
            this.requestRenderAll();
            return returnObjects;
        };
    }
}
