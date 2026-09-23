import os
import subprocess

diagrams_dir = "diagrams"
for filename in os.listdir(diagrams_dir):
    if filename.endswith(".mmd"):
        input_path = os.path.join(diagrams_dir, filename)
        output_path = os.path.join(diagrams_dir, filename.replace(".mmd", ".png"))
        print(f"Rendering {input_path} to {output_path}...")
        
        # Run mmdc using npx (using shell=True because it's Windows and npx is a .cmd file)
        cmd = f"npx mmdc -i \"{input_path}\" -o \"{output_path}\" -t default -b white -s 2"
        subprocess.run(cmd, shell=True, check=True)

print("All diagrams rendered.")
