//`timescale 1ns / 1ps
//////////////////////////////////////////////////////////////////////////////////
// Company: 
// Engineer: 
// 
// Create Date: 09/26/2022 01:54:05 AM
// Design Name: 
// Module Name: alu_io
// Project Name: 
// Target Devices: 
// Tool Versions: 
// Description: 
// 
// Dependencies: 
// 
// Revision:
// Revision 0.01 - File Created
// Additional Comments:
// 
//////////////////////////////////////////////////////////////////////////////////

module alu
#(parameter XLEN=32) 
(
    input logic [XLEN-1:0] a,b,
    input logic [3:0] op,
    output logic [XLEN-1:0] r, 
    output logic z, v
);
    localparam SHLEN=$clog2(XLEN);
    logic signed [2*XLEN-1:0] p;
    logic signed [XLEN-1:0] s;
    assign s = $signed(a) + $signed(b);    
    assign p = $signed(a) * $signed(b);


    always @* //always_comb
        case (op)
            4'b0000: r= a&b;
            4'b0001: r= a|b;
            4'b0010: r= a+b; //s;
            4'b0011: r= p[XLEN-1:0];
            4'b0100: r= p[2*XLEN-1:XLEN];
            4'b0110: r= $signed(a)-$signed(b);
            4'b0111: r= ($signed(a)<$signed(b))?1:0;
            4'b1000: r= a>>b[SHLEN-1:0];
            4'b1001: r= a<<b[SHLEN-1:0];
            4'b1010: r= $signed(a)>>>b[SHLEN-1:0];
            4'b1100: r= ~(a|b);
            4'b1101: r= a^b;
            4'b1110: r= $signed(a) / $signed(b);            
            4'b1111: r= $signed(a) % $signed(b);                                                           
            default: r= 'X;
        endcase       
          
    assign z=~|r;
    //assign v = (a[XLEN-1]^b[XLEN-1]) ? 0: (r[XLEN-1]^a[XLEN-1]);
    assign v = (op==4'b0010 || op==4'b0110) ?
               ((a[XLEN-1]^b[XLEN-1]) ? 0: (r[XLEN-1]^a[XLEN-1])) : 1'b0;

endmodule
