import os
import shutil
import glob

source_dir = r"C:\Users\supri\Desktop\dataset"
train_dir = r"C:\Users\supri\Desktop\Plant-Recognition-master\Plant-Recognition-master\training_plant_images"

# Create mapping of existing target folders to simplified names for easy matching
existing_target_folders = {}
if os.path.exists(train_dir):
    for f in os.listdir(train_dir):
        if os.path.isdir(os.path.join(train_dir, f)):
            simplified = f.lower().replace("_", "").replace(" ", "")
            existing_target_folders[simplified] = f

print("Merging new dataset into training dataset...")
added_count = 0
new_folders = 0

for source_folder in os.listdir(source_dir):
    source_folder_path = os.path.join(source_dir, source_folder)
    
    if not os.path.isdir(source_folder_path):
        continue
        
    simplified_source = source_folder.lower().replace("_", "").replace(" ", "")
    
    # Determine target folder name (merge into existing if match found, else create new)
    if simplified_source in existing_target_folders:
        target_folder = existing_target_folders[simplified_source]
        print(f"Matched '{source_folder}' -> '{target_folder}'")
    else:
        target_folder = source_folder
        print(f"New class '{source_folder}' will be added to '{target_folder}'")
        new_folders += 1
        
    target_folder_path = os.path.join(train_dir, target_folder)
    
    if not os.path.exists(target_folder_path):
        os.makedirs(target_folder_path)
        
    # Copy images
    valid_extensions = ('.png', '.jpg', '.jpeg', '.bmp', '.gif', '.webp')
    for file in os.listdir(source_folder_path):
        if file.lower().endswith(valid_extensions):
            source_file = os.path.join(source_folder_path, file)
            target_file = os.path.join(target_folder_path, file)
            
            # Handle duplicates by renaming if target file already exists
            if os.path.exists(target_file):
                base, ext = os.path.splitext(file)
                counter = 1
                while os.path.exists(target_file):
                    target_file = os.path.join(target_folder_path, f"{base}_{counter}{ext}")
                    counter += 1
            
            shutil.copy2(source_file, target_file)
            added_count += 1

print(f"Successfully copied {added_count} images.")
print(f"Added {new_folders} new plant classes.")
