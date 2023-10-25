import sys
import json
import os
# GPU 設置: CPU(-1) or GPU(0)
os.environ['CUDA_VISIBLE_DEVICES'] = '-1'
import cv2 as cv
import numpy as np
import tensorflow as tf
# tf.debugging.set_log_device_placement(True)
from tensorflow.keras.layers import Input, Conv2D, MaxPooling2D, UpSampling2D, concatenate
from tensorflow.keras.models import Model

def Read_file(file_path):
    image = cv.imread(file_path, cv.IMREAD_GRAYSCALE)
    if image is None:
        raise ValueError("無法讀取影像: {}".format(file_path))
    return image

def Crop_and_CLAHE(image):
    
    h, w = image.shape
    ru_Ax, ru_Ay = 0, 0
    ru_Bx, ru_By = 12, h
    ct_Ax, ct_Ay = int(w/2)-280, int(h/2)-280
    ct_Bx, ct_By = int(w/2)+280, int(h/2)+280
    
    ru = image[ru_Ay:ru_By, ru_Ax:ru_Bx]
    ct = image[ct_Ay:ct_By, ct_Ax:ct_Bx]
    ct = cv.createCLAHE(clipLimit=2.0, tileGridSize=(8,8)).apply(ct)
    
    return ru, ct

def Ruler_calcu(ru):
    brightness_of_each_row = np.sum(ru, axis=1)
    rows_with_high_brightness = np.where(brightness_of_each_row > 1800)[0]
    
    if rows_with_high_brightness.size == 0:
        return 0

    min_1800_index = rows_with_high_brightness[0]
    max_1800_index = rows_with_high_brightness[-1]
    count_of_5cm = rows_with_high_brightness.size

    cm_per_p = (count_of_5cm - 1) * 5 / (max_1800_index - min_1800_index + 1)
    area_per_p = cm_per_p ** 2
    
    return cm_per_p,area_per_p

def Scan_row_col(image):
    # 上下
    row_avg = np.sum(image, axis=1) / image.shape[1]
    row_white = np.where(row_avg > 10)[0]
    if row_white.size == 0:
        raise ValueError("未找到符合條件的 row")
    row_min = row_white[0]
    row_max = row_white[-1]

    # 左右
    col_avg = np.sum(image, axis=0) / image.shape[0]
    col_white = np.where(col_avg > 10)[0]
    if col_white.size == 0:
        raise ValueError("未找到符合條件的 col")
    col_min = col_white[0]
    col_max = col_white[-1]
    
    return row_min, row_max, col_min, col_max

def Max_Area(img):
    
    _, img_bin = cv.threshold(img, 127, 255, cv.THRESH_BINARY)
    count, numbers, stats, centroids = cv.connectedComponentsWithStats(img_bin, connectivity=8)
    
    max_area = 0
    max_label = 0
    for i in range(1, count):
        if stats[i, cv.CC_STAT_AREA] > max_area:
            max_area = stats[i, cv.CC_STAT_AREA]
            max_label = i
            
    largest_area = np.zeros(numbers.shape, dtype=np.uint8)
    largest_area[numbers == max_label] = 255

    kernel = np.ones((3,3),np.uint8)
    largest_component_filled = cv.morphologyEx(largest_area, cv.MORPH_CLOSE, kernel)
    
    return largest_component_filled

def Remove_small_components(img, min_area=10):
    
    _, img_bin = cv.threshold(img, 127, 255, cv.THRESH_BINARY)
    count, labels, stats, _ = cv.connectedComponentsWithStats(img_bin, connectivity=8)
    
    output_img = np.zeros_like(img_bin)
    
    for i in range(1, count):
        if stats[i, cv.CC_STAT_AREA] >= min_area:
            output_img[labels == i] = 255
    
    kernel = np.ones((3,3),np.uint8)
    output_img = cv.morphologyEx(output_img, cv.MORPH_CLOSE, kernel)
    
    return output_img

def Visualize(ct, pred_outer, pred_inner):
    # 將原始 CT 影像從灰階轉為 RGB 形式
    ct_rgb = cv.cvtColor(ct, cv.COLOR_GRAY2RGB)

    # 創建用於表示脂肪區域的透明顏色
    outer_color = np.array([0, 0, 255, 127])  # 例如：紅色，半透明
    inner_color = np.array([0, 255, 0, 127])  # 例如：綠色，半透明
    
    # 使用遮罩來標示脂肪區域
    for i in range(ct_rgb.shape[0]):
        for j in range(ct_rgb.shape[1]):
            if pred_outer[i, j]:
                ct_rgb[i, j] = (0.5 * ct_rgb[i, j] + 0.5 * outer_color[:3]).astype('uint8')
            if pred_inner[i, j]:
                ct_rgb[i, j] = (0.5 * ct_rgb[i, j] + 0.5 * inner_color[:3]).astype('uint8')
                
    return ct_rgb

def Unet(input_size=(256, 256, 1)):
    inputs = Input(input_size)

    # Encoder
    conv1 = Conv2D(64, (3, 3), activation='relu', padding='same')(inputs)
    conv1 = Conv2D(64, (3, 3), activation='relu', padding='same')(conv1)
    pool1 = MaxPooling2D(pool_size=(2, 2))(conv1)

    conv2 = Conv2D(128, (3, 3), activation='relu', padding='same')(pool1)
    conv2 = Conv2D(128, (3, 3), activation='relu', padding='same')(conv2)
    pool2 = MaxPooling2D(pool_size=(2, 2))(conv2)

    conv3 = Conv2D(256, (3, 3), activation='relu', padding='same')(pool2)
    conv3 = Conv2D(256, (3, 3), activation='relu', padding='same')(conv3)
    pool3 = MaxPooling2D(pool_size=(2, 2))(conv3)

    conv4 = Conv2D(512, (3, 3), activation='relu', padding='same')(pool3)
    conv4 = Conv2D(512, (3, 3), activation='relu', padding='same')(conv4)
    pool4 = MaxPooling2D(pool_size=(2, 2))(conv4)

    # Middle
    conv5 = Conv2D(1024, (3, 3), activation='relu', padding='same')(pool4)
    conv5 = Conv2D(1024, (3, 3), activation='relu', padding='same')(conv5)

    # Decoder
    up6 = concatenate([UpSampling2D(size=(2, 2))(conv5), conv4], axis=-1)
    conv6 = Conv2D(512, (3, 3), activation='relu', padding='same')(up6)
    conv6 = Conv2D(512, (3, 3), activation='relu', padding='same')(conv6)

    up7 = concatenate([UpSampling2D(size=(2, 2))(conv6), conv3], axis=-1)
    conv7 = Conv2D(256, (3, 3), activation='relu', padding='same')(up7)
    conv7 = Conv2D(256, (3, 3), activation='relu', padding='same')(conv7)

    up8 = concatenate([UpSampling2D(size=(2, 2))(conv7), conv2], axis=-1)
    conv8 = Conv2D(128, (3, 3), activation='relu', padding='same')(up8)
    conv8 = Conv2D(128, (3, 3), activation='relu', padding='same')(conv8)

    up9 = concatenate([UpSampling2D(size=(2, 2))(conv8), conv1], axis=-1)
    conv9 = Conv2D(64, (3, 3), activation='relu', padding='same')(up9)
    conv9 = Conv2D(64, (3, 3), activation='relu', padding='same')(conv9)

    # Output
    output = Conv2D(1, (1, 1), activation='sigmoid')(conv9)

    model = Model(inputs=inputs, outputs=output)
    return model

def process_image(image_path):
    # 讀取model
    model_full = Unet()
    model_full.load_weights('./model/full.h5')
    model_outer = Unet()
    model_outer.load_weights('./model/outer.h5')
    model_inner = Unet()
    model_inner.load_weights('./model/inner.h5')
    # 讀檔
    image = Read_file(image_path)
    # 裁剪 & 提高對比度
    ru, ct = Crop_and_CLAHE(image)
    # 計算 ruler
    cm_per_p, area_per_p = Ruler_calcu(ru)
    # 整理輸入數據為(256,256,1)
    ct_resize = cv.resize(ct, (256, 256))
    ct_resize = ct_resize.astype('float32')
    ct_resize = np.expand_dims(ct_resize, -1) / 255.0  
    # 預測
    pred_full = model_full.predict(ct_resize[np.newaxis, ...])
    pred_outer = model_outer.predict(ct_resize[np.newaxis, ...])
    pred_inner = model_inner.predict(ct_resize[np.newaxis, ...])
    # 處理預測結果 並轉為(560,560)，dtype=uint8
    pred_full = cv.resize(pred_full[0], (560, 560))
    pred_full = (pred_full * 255).astype('uint8')
    pred_outer = cv.resize(pred_outer[0], (560, 560))
    pred_outer = (pred_outer * 255).astype('uint8')
    pred_inner = cv.resize(pred_inner[0], (560, 560))
    pred_inner = (pred_inner * 255).astype('uint8')
    pred_full = Max_Area(pred_full)
    pred_outer = Max_Area(pred_outer)
    pred_inner = Remove_small_components(pred_inner, min_area=60)
    # 掃描
    row_min, row_max, col_min, col_max = Scan_row_col(pred_full)
    length = round((row_max - row_min) * cm_per_p, 2)
    width = round((col_max - col_min) * cm_per_p, 2)
    outer_fat_area = round(np.sum(pred_outer != 0) * area_per_p, 3)
    inner_fat_area = round(np.sum(pred_inner != 0) * area_per_p, 3)
    # 顯示結果
    result_image = Visualize(ct, pred_outer, pred_inner)
    output_path = './uploads/' + os.path.basename(image_path)
    cv.imwrite(output_path, result_image)

    return output_path, outer_fat_area, inner_fat_area, length, width

if __name__ == "__main__":
    image_path = sys.argv[1]
    output_path, outer_fat, inner_fat, length, width = process_image(image_path)

    # 創建要返回的JSON格式的數據
    result = {
        "outputImagePath": output_path,
        "outerFat": outer_fat,
        "innerFat": inner_fat,
        "length": length,
        "width": width
    }

    print(json.dumps(result))
