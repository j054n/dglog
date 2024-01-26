`timescale 1ns / 1ns

module alu1_tb
#(  parameter XLEN=32)
();

  // Inputs
  logic clk, rst;
  logic [XLEN-1:0] a, b;
  logic [3:0] op;
  logic [XLEN-1:0] r; 
  logic z, v;
  int i, j,k;

  // Instantiate the Unit Under Test (UUT)
  alu
    #(XLEN)
    uut (a, b, op, r, z, v);

  // Clock generation
  localparam PERIOD = 8; // 125 MHz
  always
    begin
      clk = 1'b0;
      #(PERIOD/2) clk = 1'b1;
      #(PERIOD/2);
    end

  // Stimulus
  initial
    begin
      $dumpfile("alu1.vcd");
      $dumpvars(0,alu1_tb);

      // Initialize Inputs
      clk = 0;
      rst = 1;
      #20 rst = 0;

      for (i=-4;i<4;i++) begin
        #1;
        for (j=4;j>-4;j--) begin
          #1;
          for (k=0;k<16;k++) begin
            @(posedge clk);
            a=i; b=j; op=k;
            @(negedge clk);
            $display("%t: %d op(%b) %d = %d (%b,%b)",$time,$signed(a),op,$signed(b),$signed(r),z,v);
            #1 i++;j--;
          end
        end
      end
      #200 $finish;//$stop;
    end
  
endmodule // alu1_tb

